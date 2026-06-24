var checkAnagram = function(string, target) {

    const stringCount = new Map();
    for (let i = 0; i < string.length; i++) {
        let count = stringCount.get(string[i]) + 1 || 1;
        
        stringCount.set(string[i], count);
    }

    const targetCount = new Map();
    for (let i = 0; i < target.length; i++) {
        let count = targetCount.get(target[i]) + 1 || 1;
        
        targetCount.set(target[i], count);
    }

    if (stringCount.size !== targetCount.size) {
        return false;
    }

    for (const [key, value] of stringCount) {
        if (!targetCount.has(key)) {
            return false;
        }

        if (targetCount.get(key) !== value) {
            return false;
        }
    }

    return true;
};

const s = 'abc';
const t = 'abc';

console.log(checkAnagram(s, t));