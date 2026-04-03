#!/usr/bin/env python3
"""Vienna OS Twitter daily poster. Called by cron via OpenClaw."""

import os, json, sys, random
from datetime import datetime
from requests_oauthlib import OAuth1Session

def get_twitter():
    return OAuth1Session(
        os.environ['TWITTER_CONSUMER_KEY'],
        client_secret=os.environ['TWITTER_CONSUMER_SECRET'],
        resource_owner_key=os.environ['TWITTER_ACCESS_TOKEN'],
        resource_owner_secret=os.environ['TWITTER_ACCESS_SECRET']
    )

def post_tweet(text, reply_to=None):
    twitter = get_twitter()
    payload = {"text": text}
    if reply_to:
        payload["reply"] = {"in_reply_to_tweet_id": reply_to}
    r = twitter.post("https://api.twitter.com/2/tweets", json=payload)
    if r.status_code in (200, 201):
        data = r.json()["data"]
        print(f"Posted: {data['id']}")
        return data["id"]
    else:
        print(f"Error {r.status_code}: {r.text}")
        return None

def post_thread(tweets):
    reply_to = None
    ids = []
    for text in tweets:
        tid = post_tweet(text, reply_to)
        if tid:
            reply_to = tid
            ids.append(tid)
        import time; time.sleep(2)
    return ids

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: twitter-post.py <tweet text>")
        print("   or: twitter-post.py --thread <tweet1> ||| <tweet2> ||| <tweet3>")
        sys.exit(1)
    
    if sys.argv[1] == "--thread":
        text = " ".join(sys.argv[2:])
        tweets = [t.strip() for t in text.split("|||")]
        ids = post_thread(tweets)
        print(f"Thread posted: {len(ids)} tweets")
    else:
        text = " ".join(sys.argv[1:])
        post_tweet(text)
