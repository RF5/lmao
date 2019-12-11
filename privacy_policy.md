# LMAO Privacy Policy
LMAO does not store any data of any kind. The only information it ever interacts with is the last several of lines of text in an Overleaf document. It processes them in real time and then discards them. i.e no predictions, historical text, or anything at all is ever stored.

- LMAO has no home server (only an inference endpoint if you choose to use cloud hosted predictions).
- LMAO doesn't embed any kind of analytic hooks in its code.
- LMAO doesn't cost anything and no feature of it is behind any paywall. 
- The only time LMAO connects to a remote server is 
  - (a) by Chrome when it automatically updates the extension, and 
  - (b) if you choose to use the cloud hosted predictions (and the prediction server is up and running), then whenever you start a prediction in an Overlead document, the last several lines of text in the current `.tex` file you are editing is sent via HTTPS to an AWS server, which runs it through GPT2 and returns the predictions. The sent text and computed predictions are ephemeral -- they are immidately discarded after use.

The project is currently hosted on github.com, which is owned by GitHub Inc. (now a subsidiary of Microsoft Corporation), and thus is unrelated to LMAO.

### Changes to the privacy policy
Since LMAO does not collect any information on users at all, there is no way to notify you of changes. But I will always update the privacy policy at least 3 months before they go into effect, so if you are concered just check back here a few times a year. But I don't have plants to ever change it.

That is all.