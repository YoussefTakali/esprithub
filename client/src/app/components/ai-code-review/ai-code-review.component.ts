import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AiService, CodeReviewResult, CodeAnalysisRequest } from '../../services/ai.service';
import { SnackbarService } from '../../shared/services/snackbar.service';

@Component({
  selector: 'app-ai-code-review',
  templateUrl: './ai-code-review.component.html',
  styleUrls: ['./ai-code-review.component.css']
})
export class AiCodeReviewComponent implements OnInit {

  analysisForm: FormGroup;
  result: CodeReviewResult | null = null;
  isLoading = false;
  selectedLanguage = 'java';
  selectedTab = 'code';
  multiLangResult: any = null;
  performanceResult: any = null;

  languages = [
    { value: 'java', label: 'Java', icon: '☕' },
    { value: 'javascript', label: 'JavaScript', icon: '🟨' },
    { value: 'typescript', label: 'TypeScript', icon: '🔷' },
    { value: 'python', label: 'Python', icon: '🐍' },
    { value: 'cpp', label: 'C++', icon: '⚡' },
    { value: 'c', label: 'C', icon: '🔵' },
    { value: 'csharp', label: 'C#', icon: '💜' },
    { value: 'php', label: 'PHP', icon: '🐘' },
    { value: 'ruby', label: 'Ruby', icon: '💎' },
    { value: 'go', label: 'Go', icon: '🐹' },
    { value: 'rust', label: 'Rust', icon: '🦀' },
    { value: 'swift', label: 'Swift', icon: '🍎' },
    { value: 'kotlin', label: 'Kotlin', icon: '🟦' },
    { value: 'scala', label: 'Scala', icon: '🔴' },
    { value: 'html', label: 'HTML', icon: '🌐' },
    { value: 'css', label: 'CSS', icon: '🎨' },
    { value: 'sql', label: 'SQL', icon: '🗄️' },
    { value: 'json', label: 'JSON', icon: '📄' },
    { value: 'yaml', label: 'YAML', icon: '📋' },
    { value: 'markdown', label: 'Markdown', icon: '📝' }
  ];

  codeExamples = {
    java: `public class Calculator {
    public int add(int a, int b) {
        return a + b;
    }
    
    public int divide(int a, int b) {
        return a / b; // Potential division by zero
    }
}`,
    javascript: `function processData(data) {
    if (!data) {
        console.log("No data provided");
        return;
    }
    
    const result = data.map(item => item.value * 2);
    return result.filter(val => val > 10);
}`,
    python: `def calculate_factorial(n):
    if n <= 1:
        return 1
    return n * calculate_factorial(n - 1)

print(calculate_factorial(5))`,
    cpp: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> numbers = {1, 2, 3, 4, 5};
    int sum = 0;
    
    for (int i = 0; i < numbers.size(); i++) {
        sum += numbers[i];
    }
    
    std::cout << "Sum: " << sum << std::endl;
    return 0;
}`
  };

  constructor(
    private fb: FormBuilder,
    private aiService: AiService,
    private snackbarService: SnackbarService
  ) {
    this.analysisForm = this.fb.group({
      code: ['', Validators.required],
      language: ['java', Validators.required],
      context: [''],
      fileName: ['']
    });
  }

  ngOnInit(): void {
    this.loadExample();
  }

  /**
   * Loads a code example for the selected language
   */
  loadExample(): void {
    const example = this.codeExamples[this.selectedLanguage as keyof typeof this.codeExamples];
    if (example) {
      this.analysisForm.patchValue({
        code: example,
        language: this.selectedLanguage
      });
    }
  }

  /**
   * Changes the language and loads an example
   */
  onLanguageChange(): void {
    this.selectedLanguage = this.analysisForm.get('language')?.value;
    this.loadExample();
  }

  /**
   * Analyzes the code
   */
  analyzeCode(): void {
    if (this.analysisForm.invalid) {
      this.snackbarService.showError('Please enter code to analyze');
      return;
    }

    this.isLoading = true;
    this.result = null;

    const request: CodeAnalysisRequest = {
      code: this.analysisForm.get('code')?.value,
      language: this.analysisForm.get('language')?.value,
      context: this.analysisForm.get('context')?.value || undefined
    };

    this.aiService.analyzeCode(request).subscribe({
      next: (result) => {
        this.result = result;
        this.isLoading = false;
        
        if (result.success) {
          this.snackbarService.showSuccess(`Analysis completed - Score: ${result.overallScore}/10`);
        } else {
          this.snackbarService.showError(`Analysis error: ${result.message}`);
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error during analysis:', error);
        this.snackbarService.showError('Error during code analysis');
      }
    });
  }

  /**
   * Tests analysis with a predefined example
   */
  testAnalysis(): void {
    this.isLoading = true;
    this.result = null;

    this.aiService.testCodeAnalysis().subscribe({
      next: (result) => {
        this.result = result;
        this.isLoading = false;
        
        if (result.success) {
          this.snackbarService.showSuccess(`Analysis test completed - Score: ${result.overallScore}/10`);
        } else {
          this.snackbarService.showError(`Test error: ${result.message}`);
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error during test:', error);
        this.snackbarService.showError('Error during analysis test');
      }
    });
  }

  /**
   * Tests multi-language analysis
   */
  testMultiLanguage(): void {
    this.isLoading = true;
    this.result = null;
    this.multiLangResult = null;

    // Exemple d'appel dynamique avec payload
    const payload = {
      languages: ['Java', 'Python'],
      codes: {
        Java: 'public class Test { ... }',
        Python: 'def test(): ...'
      }
    };

    this.aiService.testMultiLanguage(payload).subscribe({
      next: (result) => {
        this.isLoading = false;
        this.multiLangResult = result;
        this.snackbarService.showSuccess('Multi-language test completed');
        console.log('Multi-language results:', result);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error during multi-language test:', error);
        this.snackbarService.showError('Error during multi-language test');
      }
    });
  }

  /**
   * Tests performance
   */
  testPerformance(): void {
    this.isLoading = true;
    this.result = null;
    this.performanceResult = null;

    const payload = { size: 500000 };
    this.aiService.testPerformance(payload).subscribe({
      next: (result) => {
        this.isLoading = false;
        this.performanceResult = result;
        this.snackbarService.showSuccess('Performance test completed');
        console.log('Performance test result:', result);
      },
      error: (error) => {
        this.isLoading = false;
        this.snackbarService.showError('Error during performance test');
      }
    });
  }

  /**
   * Changes the active tab
   */
  setActiveTab(tab: string): void {
    this.selectedTab = tab;
  }

  /**
   * Gets the severity color
   */
  getSeverityColor(severity: string): string {
    return this.aiService.getSeverityColor(severity);
  }

  /**
   * Gets the priority color
   */
  getPriorityColor(priority: string): string {
    return this.aiService.getPriorityColor(priority);
  }

  /**
   * Gets the issue icon
   */
  getIssueIcon(type: string): string {
    return this.aiService.getIssueIcon(type);
  }

  /**
   * Gets the suggestion icon
   */
  getSuggestionIcon(category: string): string {
    return this.aiService.getSuggestionIcon(category);
  }

  /**
   * Gets the score badge
   */
  getScoreBadge(score: number): string {
    if (score >= 8) return 'success';
    if (score >= 6) return 'warning';
    if (score >= 4) return 'info';
    return 'danger';
  }

  /**
   * Gets the score text
   */
  getScoreText(score: number): string {
    if (score >= 8) return 'Excellent';
    if (score >= 6) return 'Good';
    if (score >= 4) return 'Average';
    return 'Needs Improvement';
  }

  getLangIcon(lang: string): string {
    const icons: any = { Java: '☕', Python: '🐍', 'C++': '⚡', JavaScript: '🟨' };
    return icons[lang] || '💻';
  }
  getScoreClass(score: number): string {
    if (score >= 90) return 'score-good';
    if (score >= 70) return 'score-medium';
    return 'score-bad';
  }
  getPerfClass(duration: number): string {
    if (duration < 1000) return 'perf-good';
    if (duration < 3000) return 'perf-medium';
    return 'perf-bad';
  }
} 