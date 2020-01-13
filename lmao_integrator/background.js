chrome.runtime.onInstalled.addListener(function() {
    chrome.storage.sync.set({lm_inference_state: 'off', pred_len: 4, context_len: 200}, function() {
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

const endpoint_name = "lmao-test-01";
const url = chrome.runtime.getURL('config.json');
let _api_key = null;
function setAPI(incoming) {
    _api_key = incoming["x-api-key"];
}

fetch(url)
    .then((response) => response.json()) //assuming file contains json
    .then((json) => setAPI(json));

function get_word_count(str_arr) {
    var wcnt = 0;
    for (let i = 0; i < str_arr.length; i++) {
        wcnt = wcnt + str_arr[i].split(" ").length
    }
    return wcnt;
}

function prune_comments_and_trim(str_arr, ctx_len) {
    function _remove_commented_lines(line) {
        const hashInd = line.indexOf('%');
        if(hashInd === 0) return false
        if(hashInd === 1 && line[hashInd - 1] != '\\') return false 
        
        return true
    }
    str_arr = str_arr.filter(_remove_commented_lines);
    for (let i = 0; i < str_arr.length; i++) {
        const hashInd = str_arr[i].search(/[^\\]%/);
        if(hashInd != -1 && hashInd != null) {
            str_arr[i] = str_arr[i].substring(0, hashInd);
        }
    }
    var tmp = str_arr.slice(1);
    if(get_word_count(str_arr) > ctx_len) {
        while(get_word_count(tmp) > ctx_len) {
            str_arr.shift();
            tmp = str_arr.slice(1);
        }
    }
    return str_arr;
}

chrome.runtime.onMessageExternal.addListener(
function(request, sender, sendResponse) {
    if(request.lines === null) {
        return;
    }

    // note: lm_inference_state is either "off", "on_local", or "on_cloud"
    chrome.storage.sync.get(['lm_inference_state', 'pred_len', 'context_len'], function(data) {
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
            var lines = prune_comments_and_trim(request.lines, data.context_len);
            xhr.send(JSON.stringify({lines: lines, pred_length: data.pred_len}));
        } else if(data.lm_inference_state === 'on_cloud') {
            var xhr = new XMLHttpRequest();
            xhr.open("POST", "https://h0sywlk4gh.execute-api.eu-west-1.amazonaws.com/test-lmao-en/invoke-lmao", true);
            xhr.setRequestHeader('x-api-key', _api_key);
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
                        msg_popup_offline('cloud');
                        console.log(xhr.statusText);
                    }
                }
            };
            xhr.onerror = function (e) {
                sendResponse(null);
                msg_popup_offline('cloud');
                console.log(xhr.statusText);
            };
            var lines = prune_comments_and_trim(request.lines, data.context_len);
            xhr.send(JSON.stringify({"data":{"lines": lines, "pred_length": data.pred_len, n_seqs: 3}}));
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

