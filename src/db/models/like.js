import { Schema, model } from 'mongoose';

// Required String Field
const reqString = {
    type: String,
    required: true,
};

// Required Boolean Field
const reqBoolean = {
    type: Boolean,
    required: true,
};

// Schema Definition
const schema = new Schema({
    userId: reqString,        // ID of the user who liked
    memberId: reqString,      // ID of the member being liked
    status: reqBoolean,       // Status of the like (active/inactive)
    message: {                // Optional message with the like
        type: String,
        default: null,
    },
}, { timestamps: true });    // Add timestamps for createdAt and updatedAt fields

// Export the model
export default model("Like", schema);
