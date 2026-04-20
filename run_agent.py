import os
import sys
import json
import time
import base64
import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("CURSOR_API_KEY")
GITHUB_REPO = os.getenv("GITHUB_REPO")

if not API_KEY:
    raise ValueError(".env 파일에 CURSOR_API_KEY가 없습니다.")
if not GITHUB_REPO:
    raise ValueError(".env 파일에 GITHUB_REPO가 없습니다.")

auth = base64.b64encode(f"{API_KEY}:".encode()).decode()

HEADERS = {
    "Authorization": f"Basic {auth}",
    "Content-Type": "application/json",
}

BASE_URL = "https://api.cursor.com/v0"


def launch_agent(prompt: str, branch: str = "main", auto_pr: bool = True) -> str:
    response = requests.post(
        f"{BASE_URL}/agents",
        headers=HEADERS,
        json={
            "prompt": {"text": prompt},
            "source": {
                "repository": GITHUB_REPO,
                "ref": branch,
            },
            "target": {
                "autoCreatePr": auto_pr,
            },
        },
        timeout=60,
    )
    response.raise_for_status()
    data = response.json()
    agent_id = data["id"]
    print(f"에이전트 시작됨: {agent_id}")
    print(f"진행 상황 확인: https://cursor.com/agents?id={agent_id}")
    return agent_id


def get_agent_status(agent_id: str) -> dict:
    response = requests.get(
        f"{BASE_URL}/agents/{agent_id}",
        headers=HEADERS,
        timeout=60,
    )
    response.raise_for_status()
    return response.json()


def stop_agent(agent_id: str):
    response = requests.post(
        f"{BASE_URL}/agents/{agent_id}/stop",
        headers=HEADERS,
        timeout=60,
    )
    response.raise_for_status()
    print(f"에이전트 중지됨: {agent_id}")


def pretty_print_status(status: dict):
    print(json.dumps(status, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "status":
        agent_id = sys.argv[2]
        status = get_agent_status(agent_id)
        pretty_print_status(status)

    elif len(sys.argv) >= 3 and sys.argv[1] == "stop":
        agent_id = sys.argv[2]
        stop_agent(agent_id)

    else:
        print("어떤 작업을 시킬까요?")
        task = input("작업 내용 입력: ").strip()

        if not task:
            print("작업 내용을 입력해주세요.")
        else:
            launch_agent(task)