/**
 * 明日计划 - 主应用逻辑
 */

const App = {
    currentTab: 'today',

    /**
     * 初始化应用
     */
    async init() {
        // 初始化通知服务
        await NotificationService.init();

        // 绑定事件
        this.bindEvents();

        // 渲染任务列表
        this.renderTasks();

        // 启动提醒检查
        NotificationService.startReminderCheck();

        // 更新通知按钮状态
        this.updateNotificationButton();

        // 检查是否需要显示通知权限提示
        this.checkNotificationPermission();

        // 注册 Service Worker
        this.registerServiceWorker();

        console.log('明日计划 App 已启动');
    },

    /**
     * 注册 Service Worker
     */
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker 注册成功:', registration.scope);
            } catch (error) {
                console.log('Service Worker 注册失败:', error);
            }
        }
    },

    /**
     * 绑定事件
     */
    bindEvents() {
        // 标签切换
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // 添加任务按钮
        document.getElementById('addTaskBtn').addEventListener('click', () => {
            this.showAddTaskModal();
        });

        // 关闭弹窗
        document.getElementById('closeModal').addEventListener('click', () => {
            this.hideAddTaskModal();
        });

        document.getElementById('cancelTask').addEventListener('click', () => {
            this.hideAddTaskModal();
        });

        // 点击遮罩关闭
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                e.target.closest('.modal').classList.remove('active');
            });
        });

        // 保存任务
        document.getElementById('saveTask').addEventListener('click', () => {
            this.saveTask();
        });

        // 通知按钮
        document.getElementById('notificationBtn').addEventListener('click', () => {
            this.handleNotificationButton();
        });

        // 提醒弹窗关闭
        document.getElementById('dismissReminder').addEventListener('click', () => {
            document.getElementById('reminderModal').classList.remove('active');
        });

        // 通知权限弹窗
        document.getElementById('allowPermission').addEventListener('click', async () => {
            document.getElementById('permissionModal').classList.remove('active');
            await NotificationService.requestPermission();
            this.updateNotificationButton();
        });

        document.getElementById('denyPermission').addEventListener('click', () => {
            document.getElementById('permissionModal').classList.remove('active');
        });

        // 键盘事件 - Enter 保存
        document.getElementById('taskContent').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.saveTask();
            }
        });
    },

    /**
     * 切换标签
     * @param {string} tab 标签名 'today' 或 'tomorrow'
     */
    switchTab(tab) {
        this.currentTab = tab;

        // 更新标签按钮状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        // 更新任务列表显示
        document.getElementById('todayTasks').classList.toggle('active', tab === 'today');
        document.getElementById('tomorrowTasks').classList.toggle('active', tab === 'tomorrow');
    },

    /**
     * 渲染任务列表
     */
    renderTasks() {
        this.renderTodayTasks();
        this.renderTomorrowTasks();
    },

    /**
     * 渲染今日任务
     */
    renderTodayTasks() {
        const tasks = Storage.getTodayTasks();
        const container = document.getElementById('todayTasks');
        const emptyState = document.getElementById('todayEmpty');

        // 清空现有任务（保留空状态提示）
        container.querySelectorAll('.task-item').forEach(el => el.remove());

        if (tasks.length === 0) {
            emptyState.style.display = 'flex';
            return;
        }

        emptyState.style.display = 'none';

        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        tasks.forEach(task => {
            const taskEl = this.createTaskElement(task, currentHour, currentMinute);
            container.appendChild(taskEl);
        });
    },

    /**
     * 渲染明日任务
     */
    renderTomorrowTasks() {
        const tasks = Storage.getTomorrowTasks();
        const container = document.getElementById('tomorrowTasks');
        const emptyState = document.getElementById('tomorrowEmpty');

        // 清空现有任务
        container.querySelectorAll('.task-item').forEach(el => el.remove());

        if (tasks.length === 0) {
            emptyState.style.display = 'flex';
            return;
        }

        emptyState.style.display = 'none';

        tasks.forEach(task => {
            const taskEl = this.createTaskElement(task);
            container.appendChild(taskEl);
        });
    },

    /**
     * 创建任务元素
     * @param {Object} task 任务对象
     * @param {number} currentHour 当前小时（用于高亮）
     * @param {number} currentMinute 当前分钟
     * @returns {HTMLElement} 任务元素
     */
    createTaskElement(task, currentHour, currentMinute) {
        const div = document.createElement('div');
        div.className = 'task-item';
        div.dataset.id = task.id;

        // 检查是否是当前时间段的任务
        if (currentHour !== undefined) {
            const [taskHour, taskMinute] = task.time.split(':').map(Number);
            const taskTotalMinutes = taskHour * 60 + taskMinute;
            const currentTotalMinutes = currentHour * 60 + currentMinute;

            // 当前任务：任务时间在当前时间的前后30分钟内
            if (Math.abs(taskTotalMinutes - currentTotalMinutes) <= 30 && !task.completed) {
                div.classList.add('current');
            }
        }

        if (task.completed) {
            div.classList.add('completed');
        }

        div.innerHTML = `
            <div class="task-checkbox ${task.completed ? 'checked' : ''}" data-id="${task.id}"></div>
            <div class="task-info">
                <div class="task-time">
                    ${task.hasReminder ? '<span class="reminder-icon">🔔</span>' : '<span class="reminder-icon">⏰</span>'}
                    ${task.time}
                </div>
                <div class="task-content">${this.escapeHtml(task.content)}</div>
            </div>
            <button class="task-delete" data-id="${task.id}">✕</button>
        `;

        // 绑定完成事件
        div.querySelector('.task-checkbox').addEventListener('click', (e) => {
            this.toggleTaskComplete(e.target.dataset.id);
        });

        // 绑定删除事件
        div.querySelector('.task-delete').addEventListener('click', (e) => {
            this.deleteTask(e.target.dataset.id);
        });

        return div;
    },

    /**
     * HTML转义
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * 显示添加任务弹窗
     */
    showAddTaskModal() {
        // 重置表单
        document.getElementById('taskContent').value = '';
        document.getElementById('taskTime').value = '09:00';
        document.getElementById('taskReminder').checked = true;
        document.getElementById('taskDate').value = this.currentTab === 'today' ? 'today' : 'tomorrow';

        document.getElementById('addTaskModal').classList.add('active');

        // 聚焦输入框
        setTimeout(() => {
            document.getElementById('taskContent').focus();
        }, 300);
    },

    /**
     * 隐藏添加任务弹窗
     */
    hideAddTaskModal() {
        document.getElementById('addTaskModal').classList.remove('active');
    },

    /**
     * 保存任务
     */
    saveTask() {
        const content = document.getElementById('taskContent').value.trim();
        const time = document.getElementById('taskTime').value;
        const hasReminder = document.getElementById('taskReminder').checked;
        const dateOption = document.getElementById('taskDate').value;

        if (!content) {
            // 抖动效果提示
            const input = document.getElementById('taskContent');
            input.style.borderColor = '#ff3b30';
            input.focus();
            setTimeout(() => {
                input.style.borderColor = '';
            }, 1000);
            return;
        }

        // 计算日期
        const now = new Date();
        let taskDate;
        if (dateOption === 'today') {
            taskDate = Storage.getDateString(now);
        } else {
            taskDate = Storage.getDateString(new Date(now.getTime() + 86400000));
        }

        // 添加任务
        const task = Storage.addTask({
            content,
            time,
            date: taskDate,
            hasReminder
        });

        console.log('任务已添加:', task);

        // 关闭弹窗并刷新列表
        this.hideAddTaskModal();
        this.renderTasks();

        // 切换到对应的标签
        this.switchTab(dateOption);
    },

    /**
     * 切换任务完成状态
     * @param {string} id 任务ID
     */
    toggleTaskComplete(id) {
        const tasks = Storage.getTasks();
        const task = tasks.find(t => t.id === id);

        if (task) {
            Storage.updateTask(id, { completed: !task.completed });
            this.renderTasks();
        }
    },

    /**
     * 删除任务
     * @param {string} id 任务ID
     */
    deleteTask(id) {
        // 添加删除动画
        const taskEl = document.querySelector(`.task-item[data-id="${id}"]`);
        if (taskEl) {
            taskEl.style.transform = 'translateX(100%)';
            taskEl.style.opacity = '0';
            setTimeout(() => {
                Storage.deleteTask(id);
                this.renderTasks();
            }, 300);
        } else {
            Storage.deleteTask(id);
            this.renderTasks();
        }
    },

    /**
     * 显示提醒弹窗
     * @param {Object} task 任务对象
     */
    showReminderModal(task) {
        document.getElementById('reminderTime').textContent = task.time;
        document.getElementById('reminderTask').textContent = task.content;
        document.getElementById('reminderModal').classList.add('active');
    },

    /**
     * 处理通知按钮点击
     */
    async handleNotificationButton() {
        const status = NotificationService.getPermissionStatus();

        if (status === 'unsupported') {
            alert('您的浏览器不支持通知功能\n\n提示：请使用 Safari 浏览器并将此网页添加到主屏幕');
            return;
        }

        if (status === 'granted') {
            alert('通知已开启 ✓\n\n您将在任务时间收到提醒');
            return;
        }

        if (status === 'denied') {
            alert('通知权限已被拒绝\n\n如需开启，请在系统设置中允许此网站发送通知');
            return;
        }

        // default - 显示权限请求弹窗
        document.getElementById('permissionModal').classList.add('active');
    },

    /**
     * 检查通知权限
     */
    checkNotificationPermission() {
        const status = NotificationService.getPermissionStatus();

        // 如果是首次使用且支持通知，延迟显示权限提示
        if (status === 'default') {
            setTimeout(() => {
                // 检查是否有带提醒的任务
                const tasks = Storage.getTasks();
                const hasReminderTasks = tasks.some(t => t.hasReminder);

                if (hasReminderTasks || tasks.length === 0) {
                    document.getElementById('permissionModal').classList.add('active');
                }
            }, 2000);
        }
    },

    /**
     * 更新通知按钮状态
     */
    updateNotificationButton() {
        const btn = document.getElementById('notificationBtn');
        const status = NotificationService.getPermissionStatus();

        if (status === 'granted') {
            btn.classList.remove('disabled');
            btn.title = '通知已开启';
        } else {
            btn.classList.add('disabled');
            btn.title = '点击开启通知';
        }
    }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// 页面可见性变化时刷新
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        App.renderTasks();
        NotificationService.checkReminders();
    }
});
