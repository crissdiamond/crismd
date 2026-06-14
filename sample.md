# CrisMD Demo Document

Welcome to your new multi-tab Markdown viewer! This sample document highlights the styling and functionality of the viewer.

## Features

- **Tabbed Viewing**: Open multiple markdown files at once.
- **Custom Zoom**: Use the controls at the bottom or press `Ctrl +` and `Ctrl -` to zoom.
- **Table of Contents**: The sidebar automatically outlines your document.
- **Full Text Search**: Find matches dynamically with `Ctrl + F`.

---

## Elements Showcase

### Code Block with Syntax Highlighting

Here is a Python code snippet. Hover over the block and click the copy icon on the top right to copy:

```python
def fibonacci(n):
    """Generate a Fibonacci sequence up to n."""
    seq = [0, 1]
    while len(seq) < n:
        seq.append(seq[-1] + seq[-2])
    return seq[:n]

print(fibonacci(10))
```

### Clean Tables

| Metric | Target | Status |
| :--- | :---: | :---: |
| UI Responsiveness | < 100ms | Pass |
| Cross-compilation | Ready | Pass |
| Zoom Support | Full | Pass |

### Callouts and Blockquotes

> [!TIP]
> This is a custom styling layout for blockquotes. It uses standard GFM alert formatting which stands out beautifully.

### Interactive Task Lists

- [x] Create implementation plan
- [x] Code Electron backend
- [x] Design premium CSS system
- [ ] Deploy to production
- [ ] Celebrate!

### Long Text Scrolling

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam elementum sodales magna, ut pretium metus elementum in. Maecenas tristique pretium elit, ut eleifend nibh tincidunt ac. Integer mollis ac nulla et vulputate. Proin rhoncus dictum eros.
