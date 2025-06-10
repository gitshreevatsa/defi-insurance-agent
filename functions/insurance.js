// This runs off-chain via Chainlink DON
const loanAmount = parseFloat(args[0]); // Convert to number
const btcPurchasePrice = parseInt(args[1]); // Strike price = exact purchase price
const premium = parseFloat(args[2]); // Convert to number


console.log("Args received:", { loanAmount, btcPurchasePrice, premium });

// Step 1: Get Deribit access token using client credentials
const authResponse = await Functions.makeHttpRequest({
  url: "https://test.deribit.com/api/v2/public/auth",
  method: "GET",
  params: {
    client_id: secrets.deribitClientId,
    client_secret: secrets.deribitClientSecret,
    grant_type: "client_credentials"
  }
});

if (authResponse.error) {
  throw Error(`Deribit auth failed: ${authResponse.error.message}`);
}

const accessToken = authResponse.data.result.access_token;
console.log("Access Token", accessToken);

// Step 2: Get current BTC price for risk assessment
const priceResponse = await Functions.makeHttpRequest({
  url: `https://priceserver-qrwzxck8.b4a.run/coins/price-convert?amount=1&symbol=BTC&convert=USD`,
  method: "GET"
});
console.log("Price Response",priceResponse);
const currentBtcPrice = priceResponse.data.convertedPrice;

// Step 4: Find the closest available strike price to btcPurchasePrice
const availableStrikes = await getAvailableStrikes(accessToken);
// Instead of using btcPurchasePrice as strike target:
const strikeTarget = Math.floor(currentBtcPrice * 0.9); // 85% of current price
const strikePrice = findClosestStrike(strikeTarget, availableStrikes);

// Step 5: Calculate option quantity (convert USD loan to BTC amount)
const btcAmount = loanAmount / btcPurchasePrice;
// Round to 1 decimal place and ensure minimum quantity
const quantity = Math.max(0.1, Math.round(btcAmount * 10) / 10);

console.log("Calculation:", { 
  loanAmount, 
  btcPurchasePrice, 
  btcAmount, 
  quantity 
});

// Step 6: Get the exact instrument name
const expiryDate = getExpiryDate();
const instrumentName = `BTC-${expiryDate}-${strikePrice}-P`;
console.log("Expiry Date:", expiryDate);
console.log("Instrument Name:", instrumentName);
console.log("Strike Price:", strikePrice);
console.log("Quantity:", quantity);

// Step 7: Verify instrument exists before buying
const instrumentCheck = await Functions.makeHttpRequest({
  url: "https://test.deribit.com/api/v2/public/get_instrument",
  method: "GET",
  params: {
    instrument_name: instrumentName
  }
});

if (instrumentCheck.error) {
  throw Error(`Instrument ${instrumentName} not found: ${instrumentCheck.error.message}`);
}

// Step 8: Purchase the put option using GET method (as per Deribit docs)
const buyResponse = await Functions.makeHttpRequest({
  url: "https://test.deribit.com/api/v2/private/buy",
  method: "GET",
  params: {
    instrument_name: instrumentName,
    amount: quantity,
    type: "market"
  },
  headers: {
    "Authorization": `Bearer ${accessToken}`
  }
});

if (buyResponse.error) {
  console.log("Buy response error:", JSON.stringify(buyResponse));
  throw Error(`Failed to buy option: ${JSON.stringify(buyResponse)}`);
}

// Return option details as JSON string
const result = {
  orderId: buyResponse.data.result.order.order_id,
  instrumentName: instrumentName,
  strikePrice: strikePrice,
  quantity: quantity,
  premium: buyResponse.data.result.order.price || buyResponse.data.result.order.average_price
};

return Functions.encodeString(JSON.stringify(result));

// Helper function to get available strike prices
async function getAvailableStrikes(token) {
  const instrumentsResponse = await Functions.makeHttpRequest({
    url: "https://test.deribit.com/api/v2/public/get_instruments",
    method: "GET",
    params: {
      currency: "BTC",
      kind: "option",
      expired: false
    }
  });
  
  if (instrumentsResponse.error) {
    throw Error("Failed to fetch available instruments");
  }
  
  const strikes = [];
  const expiry = getExpiryDate();
  console.log("Looking for expiry:", expiry);
  
  instrumentsResponse.data.result.forEach(instrument => {
    if (instrument.instrument_name.includes(`BTC-${expiry}`) && 
        instrument.instrument_name.endsWith('-P')) {
      // Extract strike price from instrument name more reliably
      const parts = instrument.instrument_name.split('-');
      if (parts.length >= 4) {
        const strike = parseInt(parts[2]);
        if (!isNaN(strike)) {
          strikes.push(strike);
        }
      }
    }
  });
  
  console.log("Available strikes:", strikes);
  return strikes.sort((a, b) => a - b);
}

// Helper function to find closest available strike to target price
function findClosestStrike(targetPrice, availableStrikes) {
  if (availableStrikes.length === 0) {
    throw Error("No available strike prices found");
  }
  
  console.log("Finding closest strike to:", targetPrice);
  console.log("Available strikes:", availableStrikes);
  
  let closest = availableStrikes[0];
  let minDiff = Math.abs(targetPrice - closest);
  
  for (let strike of availableStrikes) {
    const diff = Math.abs(targetPrice - strike);
    console.log(`Strike ${strike}: diff = ${diff}, current min = ${minDiff}`);
    if (diff < minDiff) {
      minDiff = diff;
      closest = strike;
      console.log(`New closest: ${closest}`);
    }
  }
  
  console.log("Final closest strike:", closest);
  return closest;
}

function getExpiryDate() {
  // Get next Friday (Deribit options expire on Fridays)
  const today = new Date();
  const daysUntilFriday = (5 - today.getDay() + 7) % 7 || 7;
  const nextFriday = new Date(today.getTime() + daysUntilFriday * 24 * 60 * 60 * 1000);
  
  const day = String(nextFriday.getDate()).padStart(2, '0');
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const month = months[nextFriday.getMonth()];
  const year = String(nextFriday.getFullYear()).slice(-2);
  
  return `${day}${month}${year}`;
}