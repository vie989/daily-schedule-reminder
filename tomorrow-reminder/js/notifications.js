/**
 * 通知服务
 * 管理浏览器通知权限和定时提醒
 */

const NotificationService = {
    // 通知权限状态
    permissionGranted: false,

    /**
     * 初始化通知服务
     */
    async init() {
        // 检查浏览器是否支持通知
        if (!('Notification' in window)) {
            console.log('此浏览器不支持通知');
            return false;
        }

        // 检查现有权限
        if (Notification.permission === 'granted') {
            this.permissionGranted = true;
            return true;
        }

        return false;
    },

    /**
     * 请求通知权限
     * @returns {Promise<boolean>} 是否获得权限
     */
    async requestPermission() {
        if (!('Notification' in window)) {
            alert('您的浏览器不支持通知功能');
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            this.permissionGranted = permission === 'granted';
            return this.permissionGranted;
        } catch (error) {
            console.error('请求通知权限失败:', error);
            return false;
        }
    },

    /**
     * 发送通知
     * @param {string} title 标题
     * @param {Object} options 通知选项
     */
    async sendNotification(title, options = {}) {
        if (!this.permissionGranted) {
            console.log('没有通知权限');
            return null;
        }

        try {
            // 检查 Service Worker 是否可用
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                // 通过 Service Worker 发送通知（支持后台）
                const registration = await navigator.serviceWorker.ready;
                await registration.showNotification(title, {
                    body: options.body || '',
                    icon: options.icon || '/icons/icon-192.png',
                    badge: '/icons/icon-192.png',
                    tag: options.tag || 'task-reminder',
                    requireInteraction: true,
                    vibrate: [200, 100, 200],
                    ...options
                });
            } else {
                // 直接发送通知
                const notification = new Notification(title, {
                    body: options.body || '',
                    icon: options.icon || '/icons/icon-192.png',
                    tag: options.tag || 'task-reminder',
                    ...options
                });

                notification.onclick = () => {
                    window.focus();
                    notification.close();
                };

                return notification;
            }
        } catch (error) {
            console.error('发送通知失败:', error);
            return null;
        }
    },

    /**
     * 检查是否有需要提醒的任务
     */
    checkReminders() {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const today = Storage.getDateString(now);

        const tasks = Storage.getTasks();

        tasks.forEach(task => {
            // 检查是否是今天的任务、有提醒、时间到了、还没提醒过
            if (task.date === today &&
                task.hasReminder &&
                task.time === currentTime &&
                !task.reminded &&
                !task.completed) {

                // 标记为已提醒
                Storage.updateTask(task.id, { reminded: true });

                // 发送通知
                this.sendNotification('⏰ 任务提醒', {
                    body: `${task.time} - ${task.content}`,
                    tag: task.id
                });

                // 显示App内弹窗
                if (typeof App !== 'undefined' && App.showReminderModal) {
                    App.showReminderModal(task);
                }
            }
        });
    },

    /**
     * 启动定时检查
     */
    startReminderCheck() {
        // 立即检查一次
        this.checkReminders();

        // 每30秒检查一次（更精确的提醒）
        setInterval(() => {
            this.checkReminders();
        }, 30000);

        console.log('提醒检查服务已启动');
    },

    /**
     * 获取权限状态
     * @returns {string} 权限状态
     */
    getPermissionStatus() {
        if (!('Notification' in window)) {
            return 'unsupported';
        }
        return Notification.permission;
    }
};
