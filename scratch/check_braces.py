def check_braces(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    stack = []
    lines = content.split('\n')
    for i, line in enumerate(lines):
        for j, char in enumerate(line):
            if char in '({[':
                stack.append((char, i+1, j+1))
            elif char in ')}]':
                if not stack:
                    print(f"Extra closing brace '{char}' at line {i+1}, col {j+1}")
                    continue
                opening, oi, oj = stack.pop()
                if (char == ')' and opening != '(') or \
                   (char == '}' and opening != '{') or \
                   (char == ']' and opening != '['):
                    print(f"Mismatched braces: '{opening}' at {oi}:{oj} and '{char}' at {i+1}:{j+1}")
    
    while stack:
        opening, oi, oj = stack.pop()
        print(f"Unclosed brace '{opening}' at line {oi}, col {oj}")

if __name__ == "__main__":
    import sys
    check_braces(sys.argv[1])
