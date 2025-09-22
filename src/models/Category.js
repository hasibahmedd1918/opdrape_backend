const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    description: {
        type: String,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null
    },
    image: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: true
    },
    order: {
        type: Number,
        default: 0
    },
    deletedAt: Date
}, {
    timestamps: true
});

// Add indexes for better query performance
categorySchema.index({ slug: 1 });
categorySchema.index({ parent: 1 });

const Category = mongoose.model('Category', categorySchema);

module.exports = Category; 