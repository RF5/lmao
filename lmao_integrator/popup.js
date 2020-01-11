
function inject_script() {
  console.log("Running injector script")
  setTimeout(() => {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.executeScript(tabs[0].id, {file: 'contentScript.js'});
    });
  }, 50);
}

document.addEventListener('DOMContentLoaded', (event) => {
  var offRadio = document.getElementById('offRadio');
  var onLocal = document.getElementById('onLocalHosted');
  var onCloud = document.getElementById('onCloudHosted');

  var offRadioLbl = document.getElementById('offRadioLbl');
  var onLocalLbl = document.getElementById('onLocalLbl');
  var onCloudLbl = document.getElementById('onHostedLbl');

  var prev = null;

  chrome.storage.sync.get('lm_inference_state', function(data) {
    if (data.lm_inference_state === 'off') {
      console.log("Inference is off")
      offRadio.checked = true
      setTimeout(() => {
        offRadioLbl.MaterialRadio.check()
      }, 40);

      prev = offRadio
    } else if(data.lm_inference_state === 'on_local') {
      console.log("Getting inference from local machine")
      onLocal.checked = true
      setTimeout(() => {
        onLocalLbl.MaterialRadio.check()
      }, 40);
      inject_script()
      prev = onLocal
    } else if(data.lm_inference_state === 'on_cloud') {
      console.log("Getting inference from cloud")
      onCloud.checked = true
      setTimeout(() => {
        onCloudLbl.MaterialRadio.check()
      }, 40);
      inject_script()
      prev = onCloud
    }
    offRadio.addEventListener('change', function() {
      if (this !== prev) {prev = this;}
      chrome.storage.sync.set({lm_inference_state: this.value}, function() {
        console.log("lm_inference_state has been set to", prev.value);
      });
    });
    
    onLocal.addEventListener('change', function() {
      if (this !== prev) {prev = this;}
      chrome.storage.sync.set({lm_inference_state: this.value}, function() {
        console.log("lm_inference_state has been set to", prev.value);
        inject_script()
      });
    });
    
    onCloud.addEventListener('change', function() {
      if (this !== prev) {prev = this;}
      chrome.storage.sync.set({lm_inference_state: this.value}, function() {
        console.log("lm_inference_state has been set to", prev.value);
        inject_script()
      });
    });
  });

  var links = document.getElementsByTagName("a");
  for (var i = 0; i < links.length; i++) {
      (function () {
          var ln = links[i];
          var location = ln.href;
          ln.onclick = function () {
              chrome.tabs.create({active: true, url: location});
          };
      })();
  }

  chrome.storage.sync.get('local_offline', function(data) {
    console.log(data)
    if(data.local_offline === true) {
      var spon = document.getElementById('local_status');
      spon.textContent = "[OFFLINE]"
    }
  });
  chrome.storage.sync.get('cloud_offline', function(data) {
    if(data.cloud_offline === true) {
      var spon = document.getElementById('cloud_status');
      spon.textContent = "[OFFLINE]"
    }
  });
})



