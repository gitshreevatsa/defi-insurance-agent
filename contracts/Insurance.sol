// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "node_modules/@chainlink/contracts/src/v0.8/functions/dev/v1_X/FunctionsClient.sol";
import "node_modules/@chainlink/contracts/src/v0.8/functions/dev/v1_X/libraries/FunctionsRequest.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract InsuranceAgent is FunctionsClient {
    using FunctionsRequest for FunctionsRequest.Request;
    using Strings for uint256;

    struct InsuranceRequest {
        address user;
        uint256 loanAmount;
        uint256 btcPurchasePrice;
        uint256 premium;
        bool processed;
        string optionDetails;
    }

    mapping(bytes32 => InsuranceRequest) public requests;

    uint64 public subscriptionId;
    uint32 public gasLimit = 300000;
    bytes32 public donId;

    bytes32 public s_lastRequestId;
    bytes32 public s_lastResponse;
    bytes32 public s_lastError;
    uint32 public s_lastResponseLength;
    uint32 public s_lastErrorLength;

    event InsuranceRequested(bytes32 indexed requestId, address user, uint256 btcPrice);
    event InsurancePurchased(bytes32 indexed requestId, string optionDetails);
    event InsuranceFailed(bytes32 indexed requestId, string reason);

    constructor(address router, uint64 _subscriptionId, bytes32 _donId) FunctionsClient(router) {
        subscriptionId = _subscriptionId;
        donId = _donId;
    }

    function requestInsurance(uint256 loanAmount, uint256 btcPurchasePrice) external payable {
        require(msg.value > 0, "Premium required");
        require(btcPurchasePrice > 0, "Invalid BTC price");

        FunctionsRequest.Request memory req;
        req._initializeRequestForInlineJavaScript(getJavaScriptSource());

        string[] memory args = new string[](3);
        args[0] = loanAmount.toString();
        args[1] = btcPurchasePrice.toString();
        args[2] = msg.value.toString();
        req._setArgs(args);

        req._addDONHostedSecrets(0, 1749587939); // secret slot indices

        bytes32 requestId = _sendRequest(req._encodeCBOR(), subscriptionId, gasLimit, donId);

        requests[requestId] = InsuranceRequest({
            user: msg.sender,
            loanAmount: loanAmount,
            btcPurchasePrice: btcPurchasePrice,
            premium: msg.value,
            processed: false,
            optionDetails: ""
        });

        emit InsuranceRequested(requestId, msg.sender, btcPurchasePrice);
    }

    function _fulfillRequest(bytes32 requestId, bytes memory response, bytes memory err) internal override {
        InsuranceRequest storage req = requests[requestId];
        req.processed = true;
        s_lastResponse = _bytesToBytes32(response);
        s_lastResponseLength = uint32(response.length);
        s_lastError = _bytesToBytes32(err);
        s_lastErrorLength = uint32(err.length);
        if (err.length > 0) {
            emit InsuranceFailed(requestId, string(err));
            payable(req.user).transfer(req.premium);
            return;
        }

        req.optionDetails = string(response);
        emit InsurancePurchased(requestId, req.optionDetails);
    }

    function getJavaScriptSource() private pure returns (string memory) {
      return "const loanAmount=parseFloat(args[0]);const btcPurchasePrice=parseInt(args[1]);const premium=parseFloat(args[2]);console.log(\"Args received:\",{loanAmount,btcPurchasePrice,premium});const authResponse=await Functions.makeHttpRequest({url:\"https://test.deribit.com/api/v2/public/auth\",method:\"GET\",params:{client_id:secrets.deribitClientId,client_secret:secrets.deribitClientSecret,grant_type:\"client_credentials\"}});if(authResponse.error){throw Error(`Deribit auth failed: ${authResponse.error.message}`);}const accessToken=authResponse.data.result.access_token;console.log(\"Access Token\",accessToken);const priceResponse=await Functions.makeHttpRequest({url:`https://priceserver-qrwzxck8.b4a.run/coins/price-convert?amount=1&symbol=BTC&convert=USD`,method:\"GET\"});console.log(\"Price Response\",priceResponse);const currentBtcPrice=priceResponse.data.convertedPrice;const availableStrikes=await getAvailableStrikes(accessToken);const strikeTarget=Math.floor(currentBtcPrice*0.9);const strikePrice=findClosestStrike(strikeTarget,availableStrikes);const btcAmount=loanAmount/btcPurchasePrice;const quantity=Math.max(0.1,Math.round(btcAmount*10)/10);console.log(\"Calculation:\",{loanAmount,btcPurchasePrice,btcAmount,quantity});const expiryDate=getExpiryDate();const instrumentName=`BTC-${expiryDate}-${strikePrice}-P`;console.log(\"Expiry Date:\",expiryDate);console.log(\"Instrument Name:\",instrumentName);console.log(\"Strike Price:\",strikePrice);console.log(\"Quantity:\",quantity);const instrumentCheck=await Functions.makeHttpRequest({url:\"https://test.deribit.com/api/v2/public/get_instrument\",method:\"GET\",params:{instrument_name:instrumentName}});if(instrumentCheck.error){throw Error(`Instrument ${instrumentName} not found: ${instrumentCheck.error.message}`);}const buyResponse=await Functions.makeHttpRequest({url:\"https://test.deribit.com/api/v2/private/buy\",method:\"GET\",params:{instrument_name:instrumentName,amount:quantity,type:\"market\"},headers:{\"Authorization\":`Bearer ${accessToken}`}});if(buyResponse.error){console.log(\"Buy response error:\",JSON.stringify(buyResponse));throw Error(`Failed to buy option: ${JSON.stringify(buyResponse)}`);}const result={orderId:buyResponse.data.result.order.order_id,instrumentName:instrumentName,strikePrice:strikePrice,quantity:quantity,premium:buyResponse.data.result.order.price||buyResponse.data.result.order.average_price};return Functions.encodeString(JSON.stringify(result));async function getAvailableStrikes(token){const instrumentsResponse=await Functions.makeHttpRequest({url:\"https://test.deribit.com/api/v2/public/get_instruments\",method:\"GET\",params:{currency:\"BTC\",kind:\"option\",expired:false}});if(instrumentsResponse.error){throw Error(\"Failed to fetch available instruments\");}const strikes=[];const expiry=getExpiryDate();console.log(\"Looking for expiry:\",expiry);instrumentsResponse.data.result.forEach(instrument=>{if(instrument.instrument_name.includes(`BTC-${expiry}`)&&instrument.instrument_name.endsWith('-P')){const parts=instrument.instrument_name.split('-');if(parts.length>=4){const strike=parseInt(parts[2]);if(!isNaN(strike)){strikes.push(strike);}}}});console.log(\"Available strikes:\",strikes);return strikes.sort((a,b)=>a-b);}function findClosestStrike(targetPrice,availableStrikes){if(availableStrikes.length===0){throw Error(\"No available strike prices found\");}console.log(\"Finding closest strike to:\",targetPrice);console.log(\"Available strikes:\",availableStrikes);let closest=availableStrikes[0];let minDiff=Math.abs(targetPrice-closest);for(let strike of availableStrikes){const diff=Math.abs(targetPrice-strike);console.log(`Strike ${strike}: diff = ${diff}, current min = ${minDiff}`);if(diff<minDiff){minDiff=diff;closest=strike;console.log(`New closest: ${closest}`);}}console.log(\"Final closest strike:\",closest);return closest;}function getExpiryDate(){const today=new Date();const daysUntilFriday=(5-today.getDay()+7)%7||7;const nextFriday=new Date(today.getTime()+daysUntilFriday*24*60*60*1000);const day=String(nextFriday.getDate()).padStart(2,'0');const months=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];const month=months[nextFriday.getMonth()];const year=String(nextFriday.getFullYear()).slice(-2);return `${day}${month}${year}`;}";
    }   

    function _bytesToBytes32(bytes memory b) private pure returns (bytes32 out) {
    uint256 maxLen = 32;
    if (b.length < 32) {
      maxLen = b.length;
    }
    for (uint256 i = 0; i < maxLen; ++i) {
      out |= bytes32(b[i]) >> (i * 8);
    }
    return out;
  }
}
