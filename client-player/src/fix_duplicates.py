
import os

file_path = r"c:\Users\User\Documents\24 Kilates Antigravity\Proyecto-antigravity\client-player\src\components\BronzeRoom.jsx"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Lines are 1-indexed in our manual view, so index 119 is line 120.
# We want to remove from line 120 to line 180 inclusive.
# Indices: 119 to 180 (exclusive? no, 180th line is index 179).
# range 120 to 180 inclusive means lines[119:180]? 
# Let's verify: line 120 is at index 119. line 180 is at index 179.
# We want to delete indices 119 through 179 (inclusive).
# length = 180 - 120 + 1 = 61 lines.

# Let's print the lines we are about to delete to be sure
start_line = 120
end_line = 180 # Inclusive

start_index = start_line - 1
end_index = end_line # Slice end is exclusive, so 180 means up to index 179. Wait.
# lines[119] is line 120.
# lines[179] is line 180.
# So slice should be lines[start_index:end_index] if end_index is 180. 
# 180 - 119 = 61 items. Correct.

print(f"Deleting lines {start_line} to {end_line}")
print("First deletion line:", lines[start_index].strip())
print("Last deletion line:", lines[end_index-1].strip())

del lines[start_index:end_index]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Successfully deleted lines.")
