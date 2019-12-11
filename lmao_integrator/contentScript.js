if(document.getElementById('lmao_injector_script') === null) {
    var s = document.createElement('script');
    s.id = "lmao_injector_script"
    s.src = chrome.runtime.getURL('injector.js');
    // s.onload = function() {
        // console.log(this)
        // this.remove();
    // };
    (document.head || document.documentElement).appendChild(s);

    chrome.storage.sync.set({local_offline: false},  function() {});
    chrome.storage.sync.set({cloud_offline: false},  function() {});
}
