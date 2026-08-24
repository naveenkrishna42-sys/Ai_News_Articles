import json
import os

config_path = r"C:\Users\Home\.gemini\config\config.json"
with open(config_path, "r") as f:
    config = json.load(f)

if "plugins" not in config:
    config["plugins"] = {}

if "superpowers" not in config["plugins"]:
    config["plugins"]["superpowers"] = {"enabled": False}

with open(config_path, "w") as f:
    json.dump(config, f, indent=2)

print("Updated config.json")
