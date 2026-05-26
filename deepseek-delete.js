// ==UserScript==
// @name         DeepSeek批量删除
// @namespace    https://github.com/dhtc
// @homepageURL  https://github.com/dhtc/deepseek-delete-batch
// @author       dhtc
// @license      MIT
// @version      2026-5-26
// @description  为DeepSeek网页添加了一个批量删除按钮（含全选功能）,参考https://github.com/landexie/DeepSeekBatchDelete
// @match        https://chat.deepseek.com/*
// @icon         https://www.deepseek.com/favicon.ico
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    setTimeout(main, 200);

    function main() {
        if (!JSON.parse(localStorage.getItem("userToken")).value) {
            return;
        }

        let myStyle = document.createElement("style");
        myStyle.textContent = `
            .btn::after { content: "";}
            .btn-danger { color: var(--dsw-alias-state-error-primary); overflow: hidden;}
            .btn-danger::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background-color: rgba(0, 0, 0, 0);
              transition: background-color .2s;
              pointer-events: none;
            }
            .btn-danger:hover::before {
              background-color: var(--dsw-alias-interactive-bg-hover-danger);
            }
            /* 新增：批量操作容器样式 */
            .batch-action-container {
                display: flex;
                flex-direction: column;
                gap: 6px;
                margin-bottom: 6px;
            }
            .batch-action-row {
                display: flex;
                justify-content: space-between;
                gap: 6px;
            }
            .batch-action-row > * {
                flex: 1;
            }
        `;
        document.head.append(myStyle);

        let btnNewChat = document.querySelector(".ds-scroll-area").previousSibling;

        // 克隆按钮
        let btnBatchDelete = btnNewChat.cloneNode();
        btnBatchDelete.classList.add("btn", "btn-danger");

        let btnSelectAll = btnNewChat.cloneNode();        // 新增：全选按钮
        btnSelectAll.classList.add("btn");

        let btnReverse = btnNewChat.cloneNode();
        btnReverse.classList.add("btn");

        let btnCancel = btnNewChat.cloneNode();
        btnCancel.classList.add("btn");

        let btnConfirm = btnNewChat.cloneNode();
        btnConfirm.classList.add("btn", "btn-danger");

        let checkboxes = [];

        // === 容器1：默认状态（批量删除 + 新对话） ===
        let container = document.createElement("div");
        container.style.cssText = `display: flex; justify-content: space-between; gap: 6px;`;
        btnNewChat.before(container);

        btnBatchDelete.style.flex = "1";
        btnNewChat.style.flex = "1.3";
        btnBatchDelete.innerText = "批量删除";
        container.append(btnBatchDelete, btnNewChat);

        // === 容器2：批量操作状态（两行布局） ===
        let container2 = document.createElement("div");
        container2.className = "batch-action-container";
        container.before(container2);

        // 第一行：全选 + 反选
        let row1 = document.createElement("div");
        row1.className = "batch-action-row";
        btnSelectAll.textContent = "全选";
        btnReverse.textContent = "反选";
        row1.append(btnSelectAll, btnReverse);

        // 第二行：取消 + 删除
        let row2 = document.createElement("div");
        row2.className = "batch-action-row";
        btnCancel.textContent = "取消";
        btnConfirm.textContent = "删除";
        row2.append(btnCancel, btnConfirm);

        container2.append(row1, row2);
        container2.style.display = "none";

        // === 事件绑定 ===
        btnBatchDelete.addEventListener("click", function () {
            container.style.display = "none";
            container2.style.display = "flex";
            addCheckbox();
            updateSelectAllText();
        });

        btnCancel.addEventListener("click", function () {
            container.style.display = "flex";
            container2.style.display = "none";
            removeCheckbox();
        });

        // 新增：全选/全不选 切换逻辑
        btnSelectAll.addEventListener("click", function () {
            const allChecked = checkboxes.length > 0 && checkboxes.every(cb => cb.checked);
            const targetState = !allChecked;
            for (let checkbox of checkboxes) {
                checkbox.checked = targetState;
            }
            updateSelectAllText();
        });

        btnReverse.addEventListener("click", function () {
            for (let checkbox of checkboxes) {
                checkbox.checked = !checkbox.checked;
            }
            updateSelectAllText();
        });

        btnConfirm.addEventListener("click", confirmDelete);

        // 根据当前勾选状态，动态更新「全选」按钮的文本
        function updateSelectAllText() {
            if (checkboxes.length === 0) {
                btnSelectAll.textContent = "全选";
                return;
            }
            const allChecked = checkboxes.every(cb => cb.checked);
            btnSelectAll.textContent = allChecked ? "全不选" : "全选";
        }

        function addCheckbox() {
            let chats = document.querySelector(".ds-scroll-area")
                                .querySelector(".ds-scroll-area")
                                .querySelectorAll("a");

            for (let a of chats) {
                a.style.justifyContent = "unset";
                let checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.style.cssText = `height:100%; aspect-ratio: 1; margin-right: 6px; cursor: pointer;`;
                checkbox.name = a.href.toString().split("/").pop();
                checkbox.refer = a;
                checkbox.onclick = (e) => {
                    e.stopPropagation();
                    updateSelectAllText();   // 单个勾选时同步更新按钮文本
                };
                a.prepend(checkbox);
                checkboxes.push(checkbox);
            }
        }

        function removeCheckbox() {
            for (let checkbox of checkboxes) {
                checkbox.remove();
            }
            checkboxes = [];
        }

        function removeEmptyDateGroup() {
            let dateGroups = document.querySelector(".ds-scroll-area")
                                     .querySelector(".ds-scroll-area")
                                     .firstChild.childNodes;
            for (let dateGroup of dateGroups) {
                let flagNoContent = true;
                for (let a of dateGroup.querySelectorAll("a")) {
                    if (a.style.display !== "none") {
                        flagNoContent = false;
                    }
                }
                if (flagNoContent) {
                    dateGroup.style.display = "none";
                }
            }
        }

        let observer = new MutationObserver((mutations) => {
            for (let mutation of mutations) {
                try {
                    for (let node of mutation.addedNodes) {
                        if (node.tagName === "A") {
                            node.parentElement.style.display = "";
                        }
                    }
                } catch (e) {}
            }
        });
        observer.observe(
            document.querySelector(".ds-scroll-area").querySelector(".ds-scroll-area").firstChild,
            { childList: true, subtree: true }
        );

        function confirmDelete() {
            let userToken = JSON.parse(localStorage.getItem("userToken")).value;

            (async () => {
                const promises = [];
                for (let checkbox of checkboxes) {
                    if (!checkbox.checked) continue;
                    let sessionID = checkbox.name;

                    promises.push(fetch("https://chat.deepseek.com/api/v0/chat_session/delete", {
                        "credentials": "include",
                        "headers": {
                            "Accept": "*/*",
                            "authorization": `Bearer ${userToken}`,
                            "content-type": "application/json",
                        },
                        "body": JSON.stringify({ chat_session_id: sessionID }),
                        "method": "POST",
                    }).then(r => {
                        if (r.ok) {
                            if (checkbox.name === location.href.toString().split('/').pop()) {
                                btnNewChat.click();
                            }
                            checkbox.refer.style.display = "none";
                        }
                    }));
                }

                await Promise.allSettled(promises);
                removeEmptyDateGroup();
            })();

            removeCheckbox();
            container.style.display = "flex";
            container2.style.display = "none";
        }
    }
})();
