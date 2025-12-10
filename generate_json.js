// generate_json.js (最终修正版：移除不必要的兼容逻辑)

const fs = require('fs');
const csv = require('csvtojson');

const csvFilePath='./English_high_level_learning.csv';
const jsonFilePath='./cards.json';

// 主执行逻辑
csv({
    // 确保 key 转换为小写下划线，以匹配我们在这里的逻辑
    ignoreColumns: /^\s*#/ 
}).fromFile(csvFilePath).then((jsonObj) => {
    if (!jsonObj || jsonObj.length === 0) {
        console.error('Error: The CSV file is empty or could not be parsed.');
        return;
    }
    
    const cards = jsonObj.map((row, index) => {
        let front = {};
        let back = {};
        let metadata = {};
        
        for (const key in row) {
            if (row.hasOwnProperty(key)) {
                const value = row[key];
                
                // 将所有键转换为小写，方便匹配
                const lowerKey = key.toLowerCase();

                // 1. 检查 'front_' 前缀
                if (lowerKey.startsWith('front_')) {
                    const newKey = lowerKey.substring('front_'.length);
                    front[newKey] = value;
                
                // 2. 检查 'back_' 前缀
                } else if (lowerKey.startsWith('back_')) {
                    const newKey = lowerKey.substring('back_'.length);
                    back[newKey] = value;
                
                // 3. 其他字段作为元数据
                } else {
                    metadata[lowerKey] = value;
                }
            }
        }

        // --- 规范化 Front 键名 (确保首字母大写以匹配 app.js 的 'Original', 'Explain' 等) ---
        const finalFront = {};
        for(const k in front) {
             const capitalizedKey = k.charAt(0).toUpperCase() + k.slice(1);
             finalFront[capitalizedKey] = front[k];
        }

        // --- 规范化 Back 键名 (app.js 兼容 'my_sentence', 'explain', 'ai_correction' 等小写变体) ---
        // 保持 back 对象的键为小写下划线，app.js 的 normalizeCard 会处理
        // 确保 'my_sentence' 和 'ai_correction' 是兼容的键名
        const finalBack = {};
        for(const k in back) {
            // 尝试将 my_sentence 转换为 my_sentence，ai_correction 转换为 ai_correction
            const capitalizedKey = k.charAt(0).toUpperCase() + k.slice(1); 
            finalBack[capitalizedKey] = back[k];
        }


        // 处理元数据并规范化字段名
        const key_module = metadata['key_module'] || metadata['keymodule'] || '';
        const module_name = metadata['module'] || key_module || 'default';
        
        return {
            front: finalFront,
            back: finalBack,
            'key_module': key_module,
            'module': module_name
        };
    });
    
    fs.writeFile(jsonFilePath, JSON.stringify(cards, null, 2), (err) => {
        if (err) {
            console.error('Error writing JSON file:', err);
            return;
        }
        console.log(`Successfully generated ${cards.length} cards to ${jsonFilePath}`);
    });
}).catch(err => {
    console.error('Error processing CSV file:', err);
});