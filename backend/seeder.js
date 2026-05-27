const dotenv = require('dotenv');
const connectDB = require('./config/db');
const Product = require('./models/Product');

dotenv.config();

const products = [
  {
    name: 'Organic Milk',
    description: 'Fresh organic whole milk, 1L',
    category: 'Groceries',
    quantity: 50,
    minStock: 10,
    buyingPrice: 1.2,
    sellingPrice: 2.5,
    image: '/assets-img/Milk.jpeg'
  },
  {
    name: 'Leather Wallet',
    description: 'Genuine leather bi-fold wallet',
    category: 'Accessories',
    quantity: 25,
    minStock: 5,
    buyingPrice: 15.0,
    sellingPrice: 45.0,
    image: '/assets-img/Wallet.jpeg'
  },
  {
    name: 'Smartphone X1',
    description: 'Latest model with 128GB storage',
    category: 'Devices',
    quantity: 15,
    minStock: 3,
    buyingPrice: 400.0,
    sellingPrice: 699.0,
    image: '/assets-img/Phone.jpeg'
  },
  {
    name: 'Basmati Rice',
    description: 'Premium long-grain basmati rice, 5kg',
    category: 'Groceries',
    quantity: 30,
    minStock: 5,
    buyingPrice: 12.0,
    sellingPrice: 18.5,
    image: '/assets-img/Rice.jpeg'
  },
  {
    name: 'Cotton T-Shirt',
    description: '100% Cotton premium t-shirt',
    category: 'Clothing',
    quantity: 100,
    minStock: 20,
    buyingPrice: 5.0,
    sellingPrice: 19.99,
    image: '/assets-img/Tshirt.jpeg'
  },
  {
    name: 'Matte Lipstick',
    description: 'Long-lasting velvet matte finish',
    category: 'Cosmetics',
    quantity: 40,
    minStock: 10,
    buyingPrice: 8.0,
    sellingPrice: 22.0,
    image: '/assets-img/Lipstick.jpeg'
  },
  {
    name: 'Wireless Earbuds',
    description: 'Noise cancelling Bluetooth 5.0 earbuds',
    category: 'Gadgets',
    quantity: 30,
    minStock: 5,
    buyingPrice: 25.0,
    sellingPrice: 89.0,
    image: '/assets-img/Earbuds.jpeg'
  },
  {
    name: 'Modern Coffee Table',
    description: 'Minimalist wooden coffee table',
    category: 'Furniture',
    quantity: 8,
    minStock: 2,
    buyingPrice: 120.0,
    sellingPrice: 299.0,
    image: '/assets-img/Coffeetable.jpeg'
  },
  {
    name: 'Professional Laptop',
    description: 'High performance laptop for work and play',
    category: 'Devices',
    quantity: 10,
    minStock: 2,
    buyingPrice: 800.0,
    sellingPrice: 1200.0,
    image: '/assets-img/Laptop.jpeg'
  },
  {
    name: 'Floral Perfume',
    description: 'Luxury eau de parfum for women',
    category: 'Cosmetics',
    quantity: 20,
    minStock: 5,
    buyingPrice: 45.0,
    sellingPrice: 85.0,
    image: '/assets-img/perfume.jpeg'
  },
  {
    name: 'Office Chair',
    description: 'Ergonomic adjustable office chair',
    category: 'Furniture',
    quantity: 12,
    minStock: 3,
    buyingPrice: 75.0,
    sellingPrice: 150.0,
    image: '/assets-img/OfficeChair.jpeg'
  },
  {
    name: 'Smart Watch',
    description: 'Fitness tracker with heart rate monitor',
    category: 'Gadgets',
    quantity: 45,
    minStock: 10,
    buyingPrice: 30.0,
    sellingPrice: 79.99,
    image: '/assets-img/Smartwatch.jpeg'
  },
  {
    name: 'Canned Pasta Sauce',
    description: 'Traditional tomato and herb sauce',
    category: 'Food',
    quantity: 60,
    minStock: 15,
    buyingPrice: 1.5,
    sellingPrice: 3.99,
    image: '/assets-img/PastaSauce.jpeg'
  },
  {
    name: 'Designer Denim Jacket',
    description: 'Classic blue denim jacket, slim fit',
    category: 'Clothing',
    quantity: 15,
    minStock: 5,
    buyingPrice: 35.0,
    sellingPrice: 85.0,
    image: '/assets-img/Denimjacket.jpeg'
  },
  {
    name: 'Mineral Sunscreen SPF 50',
    description: 'Non-greasy water resistant sunscreen',
    category: 'Cosmetics',
    quantity: 50,
    minStock: 10,
    buyingPrice: 12.0,
    sellingPrice: 24.99,
    image: '/assets-img/Sunscreen.jpeg'
  },
  {
    name: 'Gourmet Dark Chocolate',
    description: '85% Cocoa single origin dark chocolate',
    category: 'Food',
    quantity: 120,
    minStock: 20,
    buyingPrice: 2.5,
    sellingPrice: 6.5,
    image: '/assets-img/Rice.jpeg'
  },
  {
    name: 'Velvet Armchair',
    description: 'Emerald green luxury velvet armchair',
    category: 'Furniture',
    quantity: 4,
    minStock: 1,
    buyingPrice: 200.0,
    sellingPrice: 450.0,
    image: '/assets-img/Velvet_Armchair.jpeg'
  }
];

const seedProducts = async () => {
  try {
    const conn = await connectDB();
    if (!conn && !process.env.MONGO_URI) {
      console.warn('No DB connection available; attempting to seed using default local MongoDB.');
    }

    // Use Mongoose models directly; they will attach to the active connection
    await Product.deleteMany();
    await Product.insertMany(products);
    console.log('Data Seeded Successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedProducts();