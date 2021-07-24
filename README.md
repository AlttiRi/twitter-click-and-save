# Twitter Click'n'Save

This userscript allows you to save media content (images, videos) from Twitter's tweets by just a click on a button which appears over the media in tweets.

The content saves (downloads) with the most appropriate filename. The userscript also keeps the download history, so you will not download some media twice if you do not want it. 

## Additional enhancements
- Makes links direct in tweets and in the browser title
- Highlight visited links
- Automatically expands spoilers
- Hides: sign up bar, sign up section; trends; topics to follow

## Installation

An installed userscript manager browser extension is required. _(TamperMonkey, ViolentMonkey, GreaseMonkey)_

1. [Click on this link](https://github.com/AlttiRi/twitter-click-and-save/raw/master/twitter-click-and-save.user.js) 
2. Confirm the installation in your usersript manager.

## Let's look

![https://twitter.com/SpaceX/status/1418667693016711170](https://user-images.githubusercontent.com/16310547/126852065-519d3cb5-77eb-4af0-a0c0-58a9934c5fdd.png "https://twitter.com/SpaceX/status/1418667693016711170")

It adds a colored download button to the left upper corner of a media. It appears only when you hover mouse pointer over the tweet.
The red button means you did not save this image (or video), green — you have downloaded it right now, blue — the media is already saved.

_Note: the green button does not disapper after the mouse leave the tweet in order to easier counting that you have downloaded right now._

## Filename format

I sure this userscript saves files with the best filename.

The filename format looks so: `[twitter] {author}—{YYYY.MM.DD}—{id}—{filename}.{extension}`.

The examples:
- [twitter] SpaceX—2020.05.04—1257328055816601600—EXLtL49UYAA7vCG.jpg
- [twitter] SpaceX—2021.03.30—1376902938635870209—Exu93-nU8AAMAiC.jpg
- [twitter] SpaceX—2021.07.20—1417288642662338564—E6s4ZjGUUAEInfM.jpg
- [twitter] SpaceX—2021.07.23—1418667693016711170—E7AdwdkUYAAqxy3.jpg

## Gallery-dl config
This userscript is suited for single media downloading. If you want to download a balk of media, use [gallery-dl](https://github.com/mikf/gallery-dl).

To have the same filenames use the follow config:
```json
"twitter": {
    "retweets": "original",
    "videos": true,
    "directory": ["[gallery-dl]", "[{category}] {author[name]}"],
    "filename": "[{category}] {author[name]}—{date:%Y.%m.%d}—{retweet_id|tweet_id}—{filename}.{extension}"
}
```

Add this to `gallery-dl.conf` config file, so it will look so:
<details>
  <summary>Click to expand</summary>
  
```json
{
  "extractor": {    
    "reddit": {
      "...": "..."
    },
    
    "twitter": {
      "retweets": "original",
      "videos": true,
      "directory": ["[gallery-dl]","[{category}] {author[name]}"],
      "filename": "[{category}] {author[name]}—{date:%Y.%m.%d}—{retweet_id|tweet_id}—{filename}.{extension}"
    },
    
    "tumblr": {
      "...": "...",
      "...": "..."
    }
  }
}
```
_Do not forget to add a comma (`,`) if you put this in the middle of the json file._

</details>
