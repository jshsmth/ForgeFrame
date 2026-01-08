type CleanupTask = () => void | Promise<void>;

/**
 * Manages cleanup tasks for proper resource disposal
 */
export class CleanupManager {
  private tasks: CleanupTask[] = [];
  private cleaned = false;

  /**
   * Register a cleanup task to be executed later
   */
  register(task: CleanupTask): void {
    if (this.cleaned) {
      // Already cleaned up, execute immediately
      try {
        task();
      } catch (err) {
        console.error('Error in cleanup task:', err);
      }
      return;
    }
    this.tasks.push(task);
  }

  /**
   * Execute all cleanup tasks
   */
  async cleanup(): Promise<void> {
    if (this.cleaned) return;
    this.cleaned = true;

    // Execute in reverse order (LIFO)
    const tasks = this.tasks.reverse();
    this.tasks = [];

    for (const task of tasks) {
      try {
        await task();
      } catch (err) {
        console.error('Error in cleanup task:', err);
      }
    }
  }

  /**
   * Check if cleanup has been performed
   */
  isCleaned(): boolean {
    return this.cleaned;
  }

  /**
   * Reset the manager (for testing or reuse)
   */
  reset(): void {
    this.tasks = [];
    this.cleaned = false;
  }
}
