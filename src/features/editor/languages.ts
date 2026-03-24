export type EditorLanguage = 'python' | 'javascript' | 'java'

export type EditorLanguageConfig = {
  label: string
  monacoLanguage: 'python' | 'javascript' | 'java'
  fileName: string
  starterSource: string
}

export type EditorLanguageMap = Record<EditorLanguage, EditorLanguageConfig>

export const editorLanguages: EditorLanguageMap = {
  python: {
    label: 'Python',
    monacoLanguage: 'python',
    fileName: 'solution.py',
    starterSource: `def solve():
    name = "Mona"
    print(f"Hello, {name}!")


if __name__ == "__main__":
    solve()
`,
  },
  javascript: {
    label: 'JavaScript',
    monacoLanguage: 'javascript',
    fileName: 'solution.js',
    starterSource: `function solve() {
  const name = 'Mona';
  console.log(\`Hello, \${name}!\`);
}

solve();
`,
  },
  java: {
    label: 'Java',
    monacoLanguage: 'java',
    fileName: 'Main.java',
    starterSource: `public class Main {
  public static void main(String[] args) {
    String name = "Mona";
    System.out.println("Hello, " + name + "!");
  }
}
`,
  },
}

export const initialSourcesByLanguage = {
  python: editorLanguages.python.starterSource,
  javascript: editorLanguages.javascript.starterSource,
  java: editorLanguages.java.starterSource,
}
