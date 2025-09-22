const mongoose = require('mongoose');
const Product = require('../models/Product');
require('dotenv').config();

async function migrateReviews() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all products with ratings
    const products = await Product.find({ 'ratings.0': { $exists: true } });
    console.log(`Found ${products.length} products with reviews`);

    let totalReviews = 0;
    let updatedReviews = 0;

    // Process each product
    for (const product of products) {
      // Check if any reviews need updating
      let hasUpdates = false;

      // Update each review
      for (let i = 0; i < product.ratings.length; i++) {
        totalReviews++;
        const review = product.ratings[i];

        // Add missing fields if they don't exist
        if (review.status === undefined) {
          product.ratings[i].status = 'approved'; // assuming existing reviews are approved
          hasUpdates = true;
          updatedReviews++;
        }

        if (review.featured === undefined) {
          product.ratings[i].featured = false;
          hasUpdates = true;
          updatedReviews++;
        }

        if (review.adminResponse === undefined) {
          product.ratings[i].adminResponse = '';
          hasUpdates = true;
          updatedReviews++;
        }

        // Fix the images field format if needed
        if (Array.isArray(review.images) && review.images.length > 0 && typeof review.images[0] === 'object') {
          // Convert from {url, alt} format to string format
          product.ratings[i].images = review.images.map(img => img.url);
          hasUpdates = true;
          updatedReviews++;
        }
      }

      // Save the product if there were updates
      if (hasUpdates) {
        await product.save();
        console.log(`Updated product ${product._id} with ${product.ratings.length} reviews`);
      }
    }

    console.log(`Migration complete! Processed ${totalReviews} reviews, updated ${updatedReviews} reviews`);
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the migration
migrateReviews(); 