const express = require('express');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();
const {
  getCategoryOptions,
  menuOptions
} = require('./options');
const usersFile = 'users.json';
const fs = require('fs');
const axios = require('axios');
const path = require('path');


const app = express();
const port = process.env.PORT || 3000;
const token = process.env.TOKEN;
let isSearching = false;
let users = [];
let product = [];
let sendProductInfo = true; // Yangi mahsulotlarni yuborishni sozlash
const bot = new TelegramBot(token, {
  polling: true,
});
const admin = process.env.ADMIN

const commands = [{
    command: '/start',
    description: '♻️ Botni qayta ishga tushirish'
  },
  {
    command: '/info',
    description: '💡 Biz haqimizda'
  },
  {
    command: '/devs',
    description: '🧑‍💻 Dasturchilar'
  }
]

const commandsAdmin = [{
    command: '/start',
    description: '♻️ Botni qayta ishga tushirish'
  },
  {
    command: '/info',
    description: '💡 Biz haqimizda'
  },
  {
    command: '/dashboard',
    description: '⚙️ Admin rejimini yoqish'
  },

  {
    command: '/devs',
    description: '🧑‍💻 Dasturchilar'
  }
]




// Foydalanuvchilardan ma'lumotlar o'qish va saqlash uchun
if (fs.existsSync(usersFile)) {
  const fileContent = fs.readFileSync(usersFile, 'utf8');

  if (fileContent.trim() !== '') {
    users = JSON.parse(fileContent);
  }
}



bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const existingUser = users.find((user) => user.id === msg.from.id);
  if (chatId == admin) {
    bot.setMyCommands(commandsAdmin)
  } else {
    bot.setMyCommands(commands);
  }
  if (!existingUser) {
    users.push({
      id: msg.from.id,
      username: msg.from.username,
      first_name: msg.from.first_name,
      last_name: msg.from.last_name,
      chatId: chatId,
      storage: [],
    });

    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), 'utf8');
  }
  let selectDashboard = false
  if (msg.text === '/dashboard') {
    const usersApi = 'http://185.139.70.149:443/user';
    const contactApi = 'http://185.139.70.149:443/contactform';
    const paymentApi = 'http://185.139.70.149:443/payment';
    const groupChatId = msg.chat.id;
    let previousUsers = [];
    let userID = msg.from.id
    if (userID == admin) {
      selectDashboard = true;
      bot.sendMessage(chatId, `<b>⚙️ Admin sozlamalari yoqildi</b>`, {
        parse_mode: "HTML"
      });

      function UsersNotification() {
        async function fetchDataFromAPI() {
          try {
            const response = await axios.get(usersApi);
            const data = response.data;
            return data;
          } catch (error) {
            console.error('Ma\'lumotlar olinmadi: ', error);
            return null;
          }
        }

        // Yangi foydalanuvchilarni guruhga qo'shish va usernamelarni chiqarish funksiya
        async function handleNewUsers() {
          const data = await fetchDataFromAPI();

          if (data) {
            const newUsers = data.filter((user) => !previousUsers.includes(user.Email));
            if (newUsers.length > 0) {
              newUsers.forEach((user) => {
                bot.sendMessage(groupChatId, `<b>👤 Yangi foydalanuvchi\nIsmi: ${user.Firstname}\nFoydalanuvchi nomi: ${user.Username}\nTelefon Raqami: ${user.Email}</b>`, {
                  parse_mode: "HTML"
                });
              });

              previousUsers = previousUsers.concat(newUsers.map((user) => user.Email));
            }
          }
        }

        // Ma'lumotlarni o'zgartirish uchun interval
        if (selectDashboard) {
          intervalId = setInterval(() => {
            if (selectDashboard) {
              handleNewUsers();
            }
          }, 1000);
        }

      }
      UsersNotification()

      function ContactNOtification() {
        let previouscontacts = [];
        async function fetchDataFromAPI() {
          try {
            const response = await axios.get(contactApi);
            const data = response.data;
            return data;
          } catch (error) {
            console.error('Ma\'lumotlar olinmadi: ', error);
            return null;
          }
        }

        // Yangi foydalanuvchilarni guruhga qo'shish va usernamelarni chiqarish funksiya
        async function handleNewContact() {
          const data = await fetchDataFromAPI();

          if (data) {
            const newContact = data.filter((contact) => !previouscontacts.includes(contact.Message));
            if (newContact.length > 0) {
              newContact.forEach((contact) => {
                bot.sendMessage(groupChatId, `<b>🗣 Yangi xabar\nIsmi: ${contact.Firstname}\nEmail: ${contact.Email}\nXabar: ${contact.Message}</b>`, {
                  parse_mode: "HTML"
                });
              });

              previouscontacts = previouscontacts.concat(newContact.map((contact) => contact.Message));
            }
          }
        }

        // Ma'lumotlarni o'zgartirish uchun interval
        if (selectDashboard) {
          intervalId = setInterval(() => {
            if (selectDashboard) {
              handleNewContact()
            }
          }, 1000);
        }
      }
      ContactNOtification()

      function PaymentNOtification() {
        let previouspayments = [];
        async function fetchDataFromAPI() {
          try {
            const response = await axios.get(paymentApi);
            const data = response.data;
            return data;
          } catch (error) {
            console.error('Ma\'lumotlar olinmadi: ', error);
            return null;
          }
        }

        // Yangi foydalanuvchilarni guruhga qo'shish va usernamelarni chiqarish funksiya
        async function handlePayment() {
          const data = await fetchDataFromAPI();

          if (data) {
            const newPayments = data.filter((payment) => !previouspayments.includes(payment._id));
            if (newPayments.length > 0) {
              newPayments.forEach((payment) => {
                const productsCount = payment.Products.length;
                const inlineKeyboardOptions = {
                  reply_markup: {
                    inline_keyboard: [
                      [{
                          text: '✅ Qabul qilindi',
                          callback_data: `order:${payment._id}`
                        },
                      ],
                    ],
                  },
                };
                let message = `✅<b> Yangi buyurtma</b>`;

                if (productsCount > 0) {
                  message += `<b>🛒 Mahsulotlar:</b>\n`;

                  payment.Products.forEach((product) => {
                    message += `🔹 <b>${product.Title}</b>\n`;
                    message += `<b>🔗 Mahsulot manzili:</b> https://giftshopping.uz/product/${product.Id}\n`;
                    message += `<b>💸 Narxi:</b> ${product.Price} so'm\n\n`;
                  });
                }

                message += `<b>✨ Buyurtmangizning umumiy narxi:</b> ${payment.Price} so'm\n`;
                message += `<b>👤 Ismi:</b> ${payment.Firstname}\n`;
                message += `<b>📞 Telefon raqami:</b> ${payment.Phonenumber}\n`;
                message += `<b>⏳ Sana:</b> ${payment.Date}\n`;

                bot.sendMessage(groupChatId, message, {
                  parse_mode: "HTML",
                  ...inlineKeyboardOptions
                });
              });

              previouspayments = previouspayments.concat(newPayments.map((payment) => payment._id));
            }
          }
        }



        // Ma'lumotlarni o'zgartirish uchun interval
        if (selectDashboard) {
          intervalId = setInterval(() => {
            if (selectDashboard) {
              handlePayment()
            }
          }, 1000);
        }
      }
      PaymentNOtification()
    } else {
      bot.sendMessage(chatId, `<b>❌ Ushbu bo\'lim faqat admin uchun ishlaydi</b>`, {
        parse_mode: "HTML"
      });
    }
  } else if (msg.text === '/start') {
    await bot.sendMessage(
      chatId,
      `<b>Assalomu alaykum ${msg.from.first_name}\nSizni onlayn do'konimizda ko'rib turganimdan xursandman!</b>`, {
        parse_mode: 'HTML'
      }
    );
    return bot.sendMessage(chatId, `<b>Kerakli bo'limni tanlang</b>`, {
      parse_mode: 'HTML',
      ...menuOptions,
    });
  } else if (msg.text === '/info') {
    const inlineKeyboardOptions = {
      reply_markup: {
        inline_keyboard: [
          [{
            text: '🌐 Rasmiy vebsayt',
            url: `https://giftshopping.uz/`
          }, ],
        ],
      },
    };
    const response = await axios.get('http://185.139.70.149:443/abaut')
    bot.sendMessage(chatId, `✅ <b>${response.data[0].Title}\n\n🎙 ${response.data[0].Desc}</b>`, {
      parse_mode: "HTML",
      ...inlineKeyboardOptions
    })
  } else if (msg.text === '/devs') {
    const inlineKeyboardOptions = {
      reply_markup: {
        inline_keyboard: [
          [{
            text: '🌐 WeeB.Devs',
            url: `https://weebdevs.uz/`
          }, ],
        ],
      },
    };
    const fileName = 'logo.jpg';
    const folderName = 'images';

    // To'liq fayl manzili
    const filePath = path.join(__dirname, folderName, fileName);
    bot.sendPhoto(chatId, filePath, {
      caption: `<b>💡 Ushbu veb ilova WeeB.Devs jamoasi tomonidan tuzildi!</b>`,
      parse_mode: "HTML",
      ...inlineKeyboardOptions
    })
  } else if (msg.text === '🛍 Mahsulotlar') {
    setTimeout(() => {
      bot.sendMessage(chatId, `<b>🗂 Mahsulot kategoriyasini tanlang </b>`, {
        parse_mode: 'HTML',
        ...getCategoryOptions(),
      });
    }, 1000);
  } else if (msg.text === '🛒 Savat') {
    if (existingUser.storage.length) {
      bot.sendMessage(chatId, "<b>🛒 Savatdagi Mahsulotlar</b>", {
        parse_mode: "HTML"
      });
      existingUser.storage && existingUser.storage.map((e) => {
        const inlineKeyboardOptions = {
          reply_markup: {
            inline_keyboard: [
              [{
                  text: '❌ O\'chirish',
                  callback_data: `${e._id}`
                },
                {
                  text: '🛍 Sotib olish',
                  url: `https://giftshopping.uz/product/${e._id}`
                },
              ],
            ],
          },
        };

        const image = fs.readFileSync(`../weebstoreserver/uploads/${e.Img[0].Image1}`)
        bot.sendPhoto(chatId, image, {
          caption: `<b>${e.Title}\n${e.Desc}\nNarxi: ${e.Price} So'm\nSotildi: ${e.Sales} dona\nKategoriya: ${e.Category}</b>`,
          parse_mode: 'HTML',
          ...inlineKeyboardOptions,
        }).then((sentMessage) => {
          console.log(`Image sent. Message ID: ${sentMessage.message_id}`);
        }).catch((error) => {
          console.error('Error sending image:', error.message);
        });
      })
    } else {
      bot.sendMessage(chatId, "<b> 🛒 Savat bo'sh ❌</b>", {
        parse_mode: "HTML"
      })
    }
  } else if (msg.text === '🔍 Izlash') {
    isSearching = true; // Set isSearching to true to indicate that the bot is in search mode
    bot.sendMessage(chatId, `<b>🔍 Kerakli mahsulot nomini kiriting</b>`, {
      parse_mode: 'HTML'
    });
  } else if (isSearching) {
    let response = await axios.get('http://185.139.70.149:443/product')
    let searchProduct = filteredProducts = response.data.filter((e) => e.Title.toLowerCase().startsWith(msg.text.toLowerCase()));
    if (searchProduct.length) {
      searchProduct.map((e) => {
        let image = fs.readFileSync(`../weebstoreserver/uploads/${e.Img[0].Image1}`)
        function sendImages() {
          const inlineKeyboardOptions = {
            reply_markup: {
              inline_keyboard: [
                [{
                    text: '🛒 Savatga solish',
                    callback_data: `🛒 Savatga qo\'shish:${e._id}`
                  },
                  {
                    text: '🛍 Sotib olish',
                    url: `https://giftshopping.uz/product/${e._id}`
                  },
                ],
              ],
            },
          };

          bot.sendPhoto(chatId, image, {
            caption: `<b>${e.Title}\n${e.Desc}\nNarxi: ${e.Price} So'm\nSotildi: ${e.Sales} dona\nKategoriya: ${e.Category}</b>`,
            parse_mode: 'HTML',
            ...inlineKeyboardOptions,
          }).then((sentMessage) => {
            console.log(`Rasm yuborildi. Xabar ID: ${sentMessage.message_id}`);
          }).catch((error) => {
            console.error('Rasm yuborishda xato:', error.message);
          });
        }

        sendImages();
      })
    } else {
      bot.sendMessage(chatId, `<b>😐 Kechirasiz bunday mahsulot topa olmadim</b>`, {
        parse_mode: "HTML"
      })
    }
    // Perform search logic, and then set isSearching back to false when the search is complete
    isSearching = false;
  } else if (msg.text === '👤 Hisobim') {
    bot.sendMessage(chatId, `<b>Sizning ma'lumotlaringiz\nIsm: ${msg.from.first_name}\nFoydalanuvchi nomi: @${msg.from.username}\nSiz bizning aktiv mijozlarimiz qatoridasiz 😊</b>`, {
      parse_mode: "HTML"
    })
  } else if (msg.text === '☎️ Bog\'lanish') {
    let data = await axios.get('http://185.139.70.149:443/contact')
    // Async function to send location and contact information
    async function sendLocationAndContactInfo(chatId, locationData) {

      // Create an inline keyboard with a button to open the map in a browser
      const inlineKeyboardOptions = {
        reply_markup: {
          inline_keyboard: [
            [{
              text: '🌐 Rasmiy vebsayt',
              url: 'https://giftshopping.uz/product',
            }],
          ],
        },
      };

      // Compose the message with the other information
      const message = `<b>Manzil: ${data.data[0].Address}\nEmail: ${data.data[0].Emailcontact}\nTelefon: ${data.data[0].Phonecontact}</b>`;

      // Send the message to the user with the inline keyboard
      await bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        ...inlineKeyboardOptions,
      });
    }

    // Call the async function
    sendLocationAndContactInfo(chatId, data);


  } else if (msg.text === '📊 Statistika') {
    let response = await axios.get('http://185.139.70.149:443/user')
    bot.sendMessage(chatId, `<b>⏳ Ishga tushgan vaqt: 13.11.2023\n📊 Telegram bot: ${users.length} foydalanuvchi\n📈 Vebsayt: ${response.data.length} foydalanuvchi</b>`, {
      parse_mode: "HTML"
    })
  } 
});

// Handle callback queries
bot.on('callback_query', async (callbackQuery) => {
  try {
    const data = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;

    let filteredProducts;

    if (!sendProductInfo) {
      console.log('Mahsulot ma\'lumotlarini yuborishni to\'xtatish.');
      return;
    }

    try {
      const response = await axios.get('http://185.139.70.149:443/product');
      if (!response.data) {
        throw new Error('Mahsulot ma\'lumotlarini olishda xato: Javob ma\'lumotlari bo\'sh yoki aniqlanmagan.');
      }

      product = response.data;
      // filteredProducts ni bu qatorda aniqlashimiz kerak
      filteredProducts = product.filter((e) => e.Category === data); // Kategoriya bo'yicha filtratsiya

      if (filteredProducts.length > 0) {
        filteredProducts.forEach((findProduct) => {
          const imagePaths = fs.readFileSync(`../weebstoreserver/uploads/${findProduct.Img[0].Image1}`)

          function sendImages() {
            const inlineKeyboardOptions = {
              reply_markup: {
                inline_keyboard: [
                  [{
                      text: '🛒 Savatga solish',
                      callback_data: `🛒 Savatga qo\'shish:${findProduct._id}`
                    },
                    {
                      text: '🛍 Sotib olish',
                      url: `https://giftshopping.uz/product/${findProduct._id}`
                    },
                  ],
                ],
              },
            };

            bot.sendPhoto(chatId, imagePaths, {
              caption: `<b>${findProduct.Title}\n${findProduct.Desc}\nNarxi: ${findProduct.Price} So'm\nSotildi: ${findProduct.Sales} dona\nKategoriya: ${findProduct.Category}</b>`,
              parse_mode: 'HTML',
              ...inlineKeyboardOptions,
            }).then((sentMessage) => {
              console.log(`Rasm yuborildi. Xabar ID: ${sentMessage.message_id}`);
            }).catch((error) => {
              console.error('Rasm yuborishda xato:', error.message);
            });
          }

          sendImages();
        });
      }else if(data.startsWith('order')){
        await bot.deleteMessage(chatId, messageId);
        return bot.sendMessage(chatId, `<b>✅ Buyurtma ${callbackQuery.from.first_name} nomidan qabul qiindi</b>`,{parse_mode:"HTML"})
      }
       else if (data.startsWith('🛒 Savatga qo\'shish:')) {
        const selectedProductId = data.split(':')[1];
        const userIndex = users.findIndex((user) => user.id === callbackQuery.from.id);

        if (userIndex !== -1) {
          const findUser = users[userIndex];

          if (findUser) {
            const selectedProduct = product.find((p) => p._id === selectedProductId);

            if (selectedProduct) {
              findUser.storage.push(selectedProduct);
              await bot.deleteMessage(chatId, messageId);
              fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), 'utf8');
              bot.sendMessage(chatId, '✅ Mahsulot savatga qo\'shildi');
            } else {
              console.error('Tanlangan mahsulot topilmadi.');
            }
          } else {
            console.error('Foydalanuvchi ro\'yxatda topilmadi.');
          }

        } else {
          console.error('Foydalanuvchi ro\'yxatda topilmadi.');
        }
      } else if (data) {
        const userIndex = users.findIndex((user) => user.id === callbackQuery.from.id);

        console.log(userIndex);
        if (userIndex >= 0) {
          const findUser = users[userIndex];
          if (findUser) {
            findUser.storage = findUser.storage.filter((a) => a._id !== data)
            await bot.deleteMessage(chatId, messageId);
            await bot.sendMessage(chatId, '✅ Mahsulot savatdan olib tashlandi');
            return fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), 'utf8');
          } else {
            console.error('Foydalanuvchi ro\'yxatda topilmadi.');
          }
        } else {
          console.error('Foydalanuvchi ro\'yxatda topilmadi.');
        }
      } else {
        bot.sendMessage(chatId, 'Mahsulot topilmadi.');
      }
    } catch (error) {
      console.error(error.message);
      bot.sendMessage(chatId, 'Xatolik yuz berdi: Mahsulot ma\'lumotlari olinmadi yoki xato ro\'y berdi.');
    }
    bot.deleteMessage(chatId, messageId);
  } catch (error) {
    console.error('Callback so\'rovi qayta ishlashda xatolik:', error);
  }
});

app.use(bodyParser.json());

app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});





app.listen(port, '0.0.0.0', () => {
  console.log(`Express serverga ulanish: http://localhost:${port}`);
  console.log(`Webhook URL: /bot${token}`);
});