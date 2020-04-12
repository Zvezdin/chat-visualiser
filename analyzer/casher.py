import sys
import json
import pickle
import os.path
import os

def findRootPath(messagePath):
	for x in range(4):
		messagePath = os.path.split(messagePath)[0]
	print(messagePath)
	return messagePath

args = sys.argv[1:]
rootPath = findRootPath(args[0])

data = {}
data['messages'] = []
data['root'] = rootPath


for x in args:
	with open(x, 'r') as f:
		msgs = json.load(f)
		print("Loaded %d messages from %s (%s)" % (len(msgs['messages']) if 'messages' in msgs else -1, msgs['participants'][0]['name'] if 'participants' in msgs else "strange, none", x) )
		data['messages'].append(msgs)

def messages_size(msgs):
	return len(msgs['messages']) if 'messages' in msgs else 0

data['messages'].sort(key=messages_size, reverse=True)

print("Top messages are:")

for x in range(min(len(data['messages']), 5)):
	msgs = data['messages'][x]

	if 'messages' not in msgs or 'participants' not in msgs:
		break
	print(msgs['participants'], len(msgs['messages']))

with open('database.pickle', 'wb') as f:
	pickle.dump(data, f)
