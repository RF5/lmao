chrome.runtime.onInstalled.addListener(function() {
    chrome.storage.sync.set({lm_inference_state: 'off'}, function() {
      console.log("LMAO reset xD");
    });
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
        chrome.declarativeContent.onPageChanged.addRules([{
            conditions: [new chrome.declarativeContent.PageStateMatcher({
                pageUrl: {urlMatches: '.*overleaf\.com\\/project/.*'},
            })
            ],
            actions: [
                new chrome.declarativeContent.ShowPageAction(),
            ]
        }]);
      });
  });

var creds = new AWS.Credentials({accessKeyId: 'AKIAZCRXUH2IRTMWV6RI', secretAccessKey: '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'});
var sagemakerruntime = new AWS.SageMakerRuntime({region: "eu-west-1", credentials: creds});
const use_cloud_predictor = true;
const endpoint_name = "lmao-test-01";

chrome.runtime.onMessageExternal.addListener(
function(request, sender, sendResponse) {
    if(request.lines === null) {
        return;
    }
    // note: lm_inference_state is either "off", "on_local", or "on_cloud"
    chrome.storage.sync.get('lm_inference_state', function(data) {
        if (data.lm_inference_state === 'off') {
            // console.log("Inference is off");
            sendResponse(null);
            return;
        } else if(data.lm_inference_state === 'on_local') {
            // console.log("Getting inference from local machine")
            var xhr = new XMLHttpRequest();
            xhr.open("POST", "http://127.0.0.1:8000/infer", true);
            xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
            xhr.onload = function (e) {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        // console.log(xhr.responseText);
                        var response = JSON.parse(xhr.responseText);
                        chrome.storage.sync.set({local_offline: false},  function() {});
                        sendResponse({prediction: response.prediction});
                    } else {
                        sendResponse(null);
                        msg_popup_offline('local');
                        console.log(xhr.statusText);
                    }
                }
            };
            xhr.onerror = function (e) {
                sendResponse(null);
                msg_popup_offline('local');
                console.log(xhr.statusText);
            };
            // console.log("sending " + JSON.stringify(request.lines))
            xhr.send(JSON.stringify({lines: request.lines}));
        } else if(data.lm_inference_state === 'on_cloud') {
            // console.log("Getting inference from cloud")
            const params = {
                Body: JSON.stringify({lines: request.lines, pred_length: 5, n_seqs: 3}), 
                EndpointName: endpoint_name, 
                Accept: "application/json",
                ContentType: "application/json"
            };
            sagemakerruntime.invokeEndpoint(params, function(err, data) {
                if (err) {
                    msg_popup_offline('cloud');
                    console.log(err, err.stack); 
                } else {
                    // console.log(JSON.parse(data.Body));
                    chrome.storage.sync.set({cloud_offline: false},  function() {});
                    sendResponse({prediction: JSON.parse(data.Body).prediction})
                } 
            });
        }
    });
});

function msg_popup_offline(service) {
    if(service === 'local') {
        chrome.storage.sync.set({local_offline: true},  function() {
          });
    } else if(service === 'cloud') {
        chrome.storage.sync.set({cloud_offline: true},  function() {
          });
    }
}

