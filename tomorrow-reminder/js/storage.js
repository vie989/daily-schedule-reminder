/**
 * 本地存储服务
 * 使用 localStorage 管理任务数据
 */

const Storage = {
    TASKS_KEY: 'tomorrow_reminder_tasks',

    /**
     * 获取所有任务
     * @returns {Array} 任务列表
     */
    getTasks() {
        try {
            const data = localStorage.getItem(this.TASKS_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('读取任务失败:', error);
            return [];
        }
    },

    /**
     * 保存所有任务
     * @param {Array} tasks 任务列表
     */
    saveTasks(tasks) {
        try {
            localStorage.setItem(this.TASKS_KEY, JSON.stringify(tasks));
        } catch (error) {
            console.error('保存任务失败:', error);
        }
    },

    /**
     * 添加新任务
     * @param {Object} task 任务对象
     * @returns {Object} 添加后的任务（包含ID）
     */
    addTask(task) {
        const tasks = this.getTasks();
        const newTask = {
            id: this.generateId(),
            content: task.content,
            time: task.time,
            date: task.date,
            hasReminder: task.hasReminder,
            completed: false,
            reminded: false,
            createdAt: new Date().toISOString()
        };
        tasks.push(newTask);
        this.saveTasks(tasks);
        return newTask;
    },

    /**
     * 更新任务
     * @param {string} id 任务ID
     * @param {Object} updates 更新内容
     */
    updateTask(id, updates) {
        const tasks = this.getTasks();
        const index = tasks.findIndex(t => t.id === id);
        if (index !== -1) {
            tasks[index] = { ...tasks[index], ...updates };
            this.saveTasks(tasks);
        }
    },

    /**
     * 删除任务
     * @param {string} id 任务ID
     */
    deleteTask(id) {
        const tasks = this.getTasks();
        const filtered = tasks.filter(t => t.id !== id);
        this.saveTasks(filtered);
    },

    /**
     * 获取今日任务
     * @returns {Array} 今日任务列表
     */
    getTodayTasks() {
        const today = this.getDateString(new Date());
        return this.getTasks()
            .filter(t => t.date === today)
            .sort((a, b) => a.time.localeCompare(b.time));
    },

    /**
     * 获取明日任务
     * @returns {Array} 明日任务列表
     */
    getTomorrowTasks() {
        const tomorrow = this.getDateString(new Date(Date.now() + 86400000));
        return this.getTasks()
            .filter(t => t.date === tomorrow)
            .sort((a, b) => a.time.localeCompare(b.time));
    },

    /**
     * 获取日期字符串 YYYY-MM-DD
     * @param {Date} date 日期对象
     * @returns {string} 日期字符串
     */
    getDateString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /**
     * 生成唯一ID
     * @returns {string} UUID
     */
    generateId() {
        return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    /**
     * 清理过期任务（前天及更早的任务）
     */
    cleanupOldTasks() {
        const yesterday = new Date(Date.now() - 86400000);
        const cutoffDate = this.getDateString(yesterday);

        const tasks = this.getTasks();
        const filtered = tasks.filter(t => t.date >= cutoffDate);

        if (filtered.length !== tasks.length) {
            this.saveTasks(filtered);
            console.log(`清理了 ${tasks.length - filtered.length} 个过期任务`);
        }
    }
};

// 页面加载时清理过期任务
document.addEventListener('DOMContentLoaded', () => {
    Storage.cleanupOldTasks();
});
