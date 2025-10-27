// 家事記録アプリのメインロジック

// データストレージの定数
const STORAGE_KEY = 'chores_data';

// 家事データを管理するクラス
class ChoreManager {
    constructor() {
        this.chores = this.loadChores();
    }

    // localStorageから家事データを読み込む
    loadChores() {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    }

    // localStorageに家事データを保存
    saveChores() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.chores));
    }

    // 新しい家事を追加
    addChore(name) {
        const chore = {
            id: Date.now().toString(),
            name: name,
            lastDone: null,
            createdAt: new Date().toISOString()
        };
        this.chores.push(chore);
        this.saveChores();
        return chore;
    }

    // 家事を削除
    deleteChore(id) {
        this.chores = this.chores.filter(chore => chore.id !== id);
        this.saveChores();
    }

    // 家事の実施記録を更新
    markAsDone(id) {
        const chore = this.chores.find(chore => chore.id === id);
        if (chore) {
            chore.lastDone = new Date().toISOString();
            this.saveChores();
        }
    }

    // 全ての家事を取得（経過日数でソート）
    getAllChores() {
        return this.chores.sort((a, b) => {
            const daysA = this.getDaysSinceLastDone(a);
            const daysB = this.getDaysSinceLastDone(b);

            // まだやっていないものは最後に
            if (daysA === null && daysB === null) return 0;
            if (daysA === null) return 1;
            if (daysB === null) return -1;

            // 経過日数が多い順
            return daysB - daysA;
        });
    }

    // 最後にやってからの経過日数を計算
    getDaysSinceLastDone(chore) {
        if (!chore.lastDone) {
            return null;
        }
        const lastDone = new Date(chore.lastDone);
        const now = new Date();
        const diffTime = now - lastDone;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }

    // 経過日数に基づくステータスを取得
    getStatus(chore) {
        const days = this.getDaysSinceLastDone(chore);

        if (days === null) {
            return 'never';
        } else if (days <= 3) {
            return 'recent';
        } else if (days <= 7) {
            return 'soon';
        } else {
            return 'overdue';
        }
    }
}

// UIを管理するクラス
class ChoreUI {
    constructor(choreManager) {
        this.choreManager = choreManager;
        this.choresList = document.getElementById('chores-list');
        this.emptyState = document.getElementById('empty-state');
        this.addChoreForm = document.getElementById('add-chore-form');
        this.choreNameInput = document.getElementById('chore-name-input');

        this.initEventListeners();
        this.render();
    }

    // イベントリスナーを初期化
    initEventListeners() {
        this.addChoreForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddChore();
        });
    }

    // 家事を追加するハンドラー
    handleAddChore() {
        const name = this.choreNameInput.value.trim();
        if (name) {
            this.choreManager.addChore(name);
            this.choreNameInput.value = '';
            this.render();
        }
    }

    // 家事を削除するハンドラー
    handleDeleteChore(id) {
        if (confirm('この家事を削除しますか？')) {
            this.choreManager.deleteChore(id);
            this.render();
        }
    }

    // 家事を完了するハンドラー
    handleMarkAsDone(id) {
        this.choreManager.markAsDone(id);
        this.render();
    }

    // UIを再描画
    render() {
        const chores = this.choreManager.getAllChores();

        if (chores.length === 0) {
            this.choresList.style.display = 'none';
            this.emptyState.style.display = 'block';
        } else {
            this.choresList.style.display = 'flex';
            this.emptyState.style.display = 'none';
            this.choresList.innerHTML = chores.map(chore => this.createChoreCard(chore)).join('');

            // イベントリスナーを追加
            chores.forEach(chore => {
                const doneButton = document.getElementById(`done-${chore.id}`);
                const deleteButton = document.getElementById(`delete-${chore.id}`);

                doneButton.addEventListener('click', () => this.handleMarkAsDone(chore.id));
                deleteButton.addEventListener('click', () => this.handleDeleteChore(chore.id));
            });
        }
    }

    // 家事カードのHTMLを生成
    createChoreCard(chore) {
        const days = this.choreManager.getDaysSinceLastDone(chore);
        const status = this.choreManager.getStatus(chore);

        let dateText, daysText;

        if (days === null) {
            dateText = 'まだ記録がありません';
            daysText = '未実施';
        } else {
            const lastDoneDate = new Date(chore.lastDone);
            dateText = `最後の実施: ${this.formatDate(lastDoneDate)}`;

            if (days === 0) {
                daysText = '今日';
            } else if (days === 1) {
                daysText = '1日前';
            } else {
                daysText = `${days}日前`;
            }
        }

        return `
            <div class="chore-card status-${status}">
                <div class="chore-info">
                    <div class="chore-name">${this.escapeHtml(chore.name)}</div>
                    <div class="chore-date">
                        ${dateText}
                        <span class="days-badge">${daysText}</span>
                    </div>
                </div>
                <div class="chore-actions">
                    <button id="done-${chore.id}" class="done-button">今日やった</button>
                    <button id="delete-${chore.id}" class="delete-button">削除</button>
                </div>
            </div>
        `;
    }

    // 日付をフォーマット
    formatDate(date) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${year}年${month}月${day}日`;
    }

    // HTMLエスケープ
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// アプリケーションの初期化
document.addEventListener('DOMContentLoaded', () => {
    const choreManager = new ChoreManager();
    const choreUI = new ChoreUI(choreManager);
});
