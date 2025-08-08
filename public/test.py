import json

with open("qa_bank.json", "r", encoding="utf-8") as f:
    rj = json.load(f)
    
    print(len(rj["questions"]))