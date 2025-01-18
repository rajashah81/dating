import { Schema, model } from 'mongoose';

const reqString = {
    type: String,
    required: true
}

const reqDate = {
    type: Date,
    required: true
}

const reqNumber = {
    type: Number,
    required: true
}

const reqBoolen = {
    type: Boolean,
    required: true
}

const userSchema = Schema({
    chatId: reqString,
    name: reqString,
    age: reqNumber,
    gender: reqString,
    wantedGender: reqString,
    city: reqString,
    description: reqString,
    photo: reqString,
    status: reqBoolen,
    isSubscribed: { type: Boolean, default: false },
    registerDate: reqDate
});

const User = model('User', userSchema);

export default User;
