const axios = require('axios');

let a = [];
// Async function to fetch data and update array
async function fetchDataAndUpdateArray() {
    try {
        const response = await axios.get('https://emakfood.hopto.org/product');
        const data = response.data;

        // Keep track of added categories to avoid duplicates
        const addedCategories = new Set();

        // Clear the array before updating
        a = [];

        // Update array based on fetched data
        data && data.forEach((e) => {
            // Check if the category is already added
            if (!addedCategories.has(e.Category)) {
                a.push(e.Category);
                addedCategories.add(e.Category);
            }
        });

        // Log the updated array
    } catch (error) {
        console.error('Error fetching categories:', error);
    }
}

// Set interval to fetch data every 2 seconds
setInterval(fetchDataAndUpdateArray, 2000);

// Export the menuOptions
const menuOptions = {
    reply_markup: JSON.stringify({
        keyboard: [
            [{ text: '🛍 Mahsulotlar', callback_data: '🛍 Mahsulotlar' }, { text: '🔍 Izlash', callback_data: '🔍 Izlash' }],
            [{ text: '🛒 Savat', callback_data: '🛒 Savat' }, { text: '👤 Hisobim', callback_data: '👤 Hisobim' }],
            [{ text: '☎️ Bog\'lanish', callback_data: '☎️ Bog\'lanish' }, { text: '📊 Statistika', callback_data: '📊 Statistika' }],
        ],
        resize_keyboard: true,
    }),
};

// Export a function to get the updated categoryOptions
function getCategoryOptions() {
    return {
        reply_markup: JSON.stringify({
            inline_keyboard: a.map((x, xi) => ([{
                text: x,
                callback_data: x,
            }])),
        }),
    };
}

module.exports = {
    menuOptions,
    getCategoryOptions,
};
