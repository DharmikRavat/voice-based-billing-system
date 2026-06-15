// tests/api.test.js
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');

let mongoServer;
let app;
let Menu;
let Order;

// Setup in-memory MongoDB before running tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  // Override environment variables for testing
  process.env.MONGODB_URI = uri;
  process.env.NODE_ENV = 'test';
  process.env.GST_RATE = '0.05';
  process.env.HF_TOKEN = 'hf_mock_token_for_testing';

  // Import app and models after environment setup
  const connectDB = require('../config/db');
  await connectDB();

  app = require('../app');
  Menu = require('../models/Menu');
  Order = require('../models/Order');

  // Seed menu items for tests
  const seedItems = [
    { name: 'Paneer Butter Masala', price: 280, category: 'Main Course' },
    { name: 'Dal Makhani', price: 220, category: 'Main Course' },
    { name: 'Butter Naan', price: 50, category: 'Bread' },
    { name: 'Garlic Naan', price: 60, category: 'Bread' },
    { name: 'Mango Lassi', price: 90, category: 'Beverages' }
  ];

  await Menu.insertMany(seedItems.map(item => ({
    ...item,
    normalizedName: item.name.toLowerCase().trim()
  })));
});

// Clean up database connections after tests
afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Voice Billing System API Integration Tests', () => {

  describe('GET /api/health', () => {
    it('should return 200 OK and uptime details', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('uptime');
    });
  });

  describe('GET /api/menu', () => {
    it('should retrieve all menu items', async () => {
      const res = await request(app).get('/api/menu');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.length).toBe(5);
    });

    it('should filter menu items by category', async () => {
      const res = await request(app).get('/api/menu?category=Bread');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].name).toContain('Naan');
    });
  });

  describe('POST /api/menu', () => {
    it('should successfully create a new menu item', async () => {
      const newItem = {
        name: 'Veg Biryani',
        price: 260,
        category: 'Rice',
        description: 'Flavorful vegetable biryani'
      };

      const res = await request(app)
        .post('/api/menu')
        .send(newItem);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Veg Biryani');
      expect(res.body.data.normalizedName).toBe('veg biryani');
    });

    it('should fail with 409 Conflict if menu item name already exists', async () => {
      const duplicateItem = {
        name: 'Dal Makhani',
        price: 240,
        category: 'Main Course'
      };

      const res = await request(app)
        .post('/api/menu')
        .send(duplicateItem);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('already exists');
    });

    it('should fail with 400 Bad Request if required fields are missing', async () => {
      const incompleteItem = {
        name: 'Lassi'
        // missing price and category
      };

      const res = await request(app)
        .post('/api/menu')
        .send(incompleteItem);

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/orders', () => {
    it('should create a valid order and calculate totals correctly', async () => {
      const payload = {
        items: [
          { name: 'Paneer Butter Masala', qty: 2 },
          { name: 'Butter Naan', qty: 3 }
        ],
        tableNumber: 4,
        customerName: 'Aarav Sharma',
        paymentMethod: 'UPI'
      };

      const res = await request(app)
        .post('/api/orders')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('orderNumber');
      expect(res.body.data.tableNumber).toBe(4);
      expect(res.body.data.customerName).toBe('Aarav Sharma');

      // Subtotal = (280 * 2) + (50 * 3) = 560 + 150 = 710 INR
      // Tax = 710 * 0.05 = 35.5 INR
      // Grand Total = 710 + 35.5 = 745.5 INR
      expect(res.body.data.subtotal).toBe(710);
      expect(res.body.data.taxAmount).toBe(35.5);
      expect(res.body.data.grandTotal).toBe(745.5);
    });

    it('should succeed with warnings if some items are not found', async () => {
      const payload = {
        items: [
          { name: 'Paneer Butter Masala', qty: 1 },
          { name: 'Imaginary Special Curry', qty: 1 }
        ],
        tableNumber: 2
      };

      const res = await request(app)
        .post('/api/orders')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.warnings.notFound).toContain('Imaginary Special Curry');
      expect(res.body.data.items.length).toBe(1); // Only Paneer Butter Masala resolved
    });

    it('should return 400 if no items in payload are valid', async () => {
      const payload = {
        items: [
          { name: 'Imaginary Dish 1' },
          { name: 'Imaginary Dish 2' }
        ],
        tableNumber: 1
      };

      const res = await request(app)
        .post('/api/orders')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('No valid items found');
    });
  });

  describe('GET and PATCH and DELETE lifecycle for /api/orders', () => {
    let orderId;

    beforeEach(async () => {
      const menu = await Menu.findOne({ name: 'Dal Makhani' });
      const order = new Order({
        tableNumber: 1,
        items: [
          { name: 'Dal Makhani', menuItemId: menu._id, quantity: 1, unitPrice: 220, totalPrice: 220 }
        ],
        subtotal: 220,
        gstRate: 0.05,
        taxAmount: 11,
        grandTotal: 231
      });
      await order.save();
      orderId = order._id.toString();
    });

    it('should retrieve a list of orders', async () => {
      const res = await request(app).get('/api/orders');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.orders).toBeDefined();
    });

    it('should retrieve a single order by ID', async () => {
      const res = await request(app).get(`/api/orders/${orderId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(orderId);
    });

    it('should update order status', async () => {
      const res = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .send({ status: 'paid' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('paid');
    });

    it('should soft-delete/cancel an order', async () => {
      const res = await request(app).delete(`/api/orders/${orderId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify status is cancelled
      const verifyRes = await request(app).get(`/api/orders/${orderId}`);
      expect(verifyRes.body.data.status).toBe('cancelled');
    });
  });

  describe('POST /api/ai/process-text', () => {
    it('should successfully match simple transcript to items', async () => {
      const payload = {
        text: 'give me one paneer butter masala and two garlic naan'
      };

      const res = await request(app)
        .post('/api/ai/process-text')
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transcript).toBe(payload.text);

      // Check resolved items
      const resolved = res.body.data.resolvedItems;
      expect(resolved.some(r => r.name === 'Paneer Butter Masala')).toBe(true);
      expect(resolved.some(r => r.name === 'Garlic Naan')).toBe(true);

      // Check bill calculation is returned
      expect(res.body.data.billing.grandTotal).toBeGreaterThan(0);
    });

    it('should fail with 400 if text is empty', async () => {
      const res = await request(app)
        .post('/api/ai/process-text')
        .send({ text: '' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

});
