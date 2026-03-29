export type JavaStdoutTestCase = {
  testId: string
  input: string
  expectedStdout: string
}

export type JavaProblem = {
  problemId: string
  title: string
  prompt: string
  language: 'java'
  hiddenTests: JavaStdoutTestCase[]
}

const sampleFibonacciProblem: JavaProblem = {
  problemId: 'java-fibonacci',
  title: 'Fibonacci',
  prompt: [
    'Read a single non-negative integer n from standard input.',
    'Print the nth Fibonacci number to standard output.',
    'Use the sequence definition F(0) = 0, F(1) = 1.',
  ].join(' '),
  language: 'java',
  hiddenTests: [
    {
      testId: 'fib-0',
      input: '0\n',
      expectedStdout: '0\n',
    },
    {
      testId: 'fib-1',
      input: '1\n',
      expectedStdout: '1\n',
    },
    {
      testId: 'fib-7',
      input: '7\n',
      expectedStdout: '13\n',
    },
    {
      testId: 'fib-10',
      input: '10\n',
      expectedStdout: '55\n',
    },
  ],
}

export function getProblemById(problemId: string): JavaProblem {
  void problemId
  return sampleFibonacciProblem
}
