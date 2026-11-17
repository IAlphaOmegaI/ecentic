"""Render local Clay node payloads using IDs returned by the CLI; never calls Clay."""

import argparse
import json
from pathlib import Path


def identifier(value):
    if not value or len(value) > 128 or any(character.isspace() for character in value) or any(character in value for character in "<>{}"):
        raise argparse.ArgumentTypeError("Use the actual node ID returned by Clay.")
    return value


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--trigger-node", required=True, type=identifier)
    parser.add_argument("--research-node", type=identifier)
    parser.add_argument("--destination", required=True, type=Path)
    arguments = parser.parse_args()
    source = Path(__file__).resolve().parent
    arguments.destination.mkdir(parents=True, exist_ok=True)

    def pinned(keys, node):
        return {key: {"type": "string", "sourceNodeId": node, "sourcePath": "$." + key} for key in keys}

    research = {
        "nodeType": "agent", "name": "Check current role and company size",
        "agentName": "ecentic role and team research",
        "agentPrompt": (source / "research.md").read_text(),
        "inputSchema": {
            "type": "object",
            "properties": pinned(("domain", "name", "linkedin_url", "title", "company"), arguments.trigger_node),
            "required": ["domain", "title"],
        },
        "outputSchema": {
            "research_json": {
                "type": "string",
                "description": "One JSON object with person and company source observations in the exact prompt shape. No markdown, dates of execution, verification receipts or invented facts.",
            }
        },
        "incomingEdges": [{"sourceNode": arguments.trigger_node}],
    }
    (arguments.destination / "research.node.json").write_text(json.dumps(research, indent=2) + "\n")
    (arguments.destination / "research.web-search.json").write_text(json.dumps({"agentInternetSearchEnabled": True}, indent=2) + "\n")

    if arguments.research_node:
        properties = pinned(("domain", "name", "linkedin_url", "title"), arguments.trigger_node)
        properties["research_json"] = {
            "type": "string", "sourceNodeId": arguments.research_node, "sourcePath": "$.research_json",
        }
        normalization = {
            "nodeType": "code", "name": "Validate role and team recommendation",
            "code": (source / "normalize.py").read_text(),
            "inputSchema": {"type": "object", "properties": properties, "required": ["domain", "title", "research_json"]},
            "outputSchema": json.loads((source / "output-schema.json").read_text()),
            "incomingEdges": [{"sourceNode": arguments.research_node}],
        }
        (arguments.destination / "normalize.node.json").write_text(json.dumps(normalization, indent=2) + "\n")
    print(json.dumps({"directory": str(arguments.destination), "research": True, "normalization": bool(arguments.research_node), "remote_changes": False}))


if __name__ == "__main__":
    main()
