  let blockchain = new URLSearchParams(window.location.search).get('blockchain') || "tez"
  let contract = new URLSearchParams(window.location.search).get('contract') || ""
  let tokenID = new URLSearchParams(window.location.search).get('token_id') || ""
  let xhrParams = JSON.stringify({
    "ids": [
      [blockchain, contract, tokenID].join("-")
    ]
  })

  let xhr = new XMLHttpRequest();
  let url = 'https://indexer.autonomy.io/nft/query';
  xhr.open('POST', url);
  //Send the proper header information along with the request
  xhr.setRequestHeader('content-type', 'application/json');
  xhr.onreadystatechange = function () { //Call a function when the state changes.
    if (xhr.readyState == 4) {
      if (xhr.status == 200) {
        let tokens = JSON.parse(xhr.responseText)
        if (tokens.length == 0) {
          window.dispatchEvent(new CustomEvent("provenance-request-error", {
            "detail": {
              error: new Error("token not found")
            }
          }))
          return
        }
        window.dispatchEvent(new CustomEvent("provenance-ready", {
          "detail": {
            provenances: tokens[0].provenance
          }
        }))
      } else {
        window.dispatchEvent(new CustomEvent("provenance-request-error", {
          "detail": {
            error: new Error("response is not ok. status: " + xhr.status)
          }
        }))
      }
    }
  }

  xhr.onerror = function (e) {
    window.dispatchEvent(new CustomEvent("provenance-request-error", {
      "detail": {
        error: new Error("Unknown Error: server response not received")
      }
    }))
  };

  xhr.send(xhrParams);
