# import_cards_data.py (修正版)
import sqlite3
import json
from datetime import date, timedelta
# 修正后的导入：只需要 DB_NAME 和 connect_db
from database_manager import DB_NAME, connect_db 

CARDS_JSON_FILE = 'cards.json'
# 假设的今天日期，用于设置初始状态
TODAY = date(2025, 12, 11) 

def create_cards_table():
    """创建新的卡片表"""
    conn = connect_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS cards (
            card_id TEXT PRIMARY KEY,
            module_id TEXT NOT NULL,
            key_title TEXT,
            
            ci INTEGER NOT NULL,
            lrd TEXT NOT NULL,
            lad TEXT NOT NULL,
            is_core INTEGER NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

def import_all_cards_from_json():
    """读取 cards.json，只处理 Module 1，注入初始 SRS 状态，并导入数据库"""
    create_cards_table() # 在此文件内部调用，确保表存在
    conn = connect_db()
    cursor = conn.cursor()

    try:
        # 使用 contentFetchId 导入用户上传的 cards.json
        # 注意：此处假设 cards.json 已存在于当前工作目录
        with open(CARDS_JSON_FILE, 'r', encoding='utf-8') as f:
            full_data = json.load(f)
    except FileNotFoundError:
        print(f"错误: 找不到 {CARDS_JSON_FILE} 文件，请确保文件存在。")
        conn.close()
        return

    cursor.execute('SELECT COUNT(*) FROM cards')
    if cursor.fetchone()[0] > 0:
        print("数据库中已有数据，跳过初始导入。")
        conn.close()
        return

    inserted_count = 0
    
    # 遍历所有模块
    for module in full_data.get('modules', []):
        module_id = module['moduleId']
        
        # 核心修改：只处理 Module 1 的数据
        if module_id != 'mod1':
            continue 
            
        for card_data in module.get('cards', []):
            card_id = card_data['cardId']
            
            # --- 注入初始 SRS 状态 (保持与单元测试一致) ---
            ci = 5
            lrd = TODAY - timedelta(days=5) 
            lad = TODAY - timedelta(days=1)
            is_core = 0
            key_title = card_data.get('title') or 'Untitled'
            
            if card_id == 'mod1_card_1': 
                ci = 100 
                lrd = TODAY - timedelta(days=105) 
                lad = TODAY - timedelta(days=31) 
                is_core = 0
            elif card_id == 'mod1_card_2': 
                ci = 1
                lrd = TODAY - timedelta(days=2) 
                lad = TODAY - timedelta(days=10)
                is_core = 1 
            
            cursor.execute('''
                INSERT INTO cards (card_id, module_id, key_title, ci, lrd, lad, is_core)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                card_id,
                module_id,
                key_title,
                ci,
                lrd.isoformat(),
                lad.isoformat(),
                is_core
            ))
            inserted_count += 1

    conn.commit()
    print(f"🎉 成功导入 {inserted_count} 条 Module 1 卡片到 {DB_NAME} 数据库中。")
    conn.close()

if __name__ == '__main__':
    # 运行此脚本以初始化数据库
    import_all_cards_from_json()