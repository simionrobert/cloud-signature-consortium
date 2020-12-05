import mongoose, {Schema,Document} from 'mongoose';

export interface ISad extends Document{
    value: String,
    hashes: String[],
    credential_id: String,
    creation_date: Date
};

const SadSchema:Schema = new Schema({
    value: { type: String, unique: true },
    hashes: [String],
    credential_id: String,
    creation_date: { type: Date, default: Date.now() }
});

export default mongoose.model<ISad>('sads', SadSchema);