import mongoose, {Schema,Document} from 'mongoose';
import crypto from 'crypto';

export interface IClient extends Document{
    name: String,
    client_id: String,
    client_secret: String,
    redirect_uri: String
};

const ClientSchema:Schema = new Schema({
    name: String,
    client_id: { type: String, unique: true },
    client_secret: String,
    redirect_uri: String
});


ClientSchema.methods.verify = function (value) {
    return this.client_secret === crypto.createHash('sha256').update(value).digest('hex');
};

const Client =mongoose.model<IClient>('clients', ClientSchema);

export default Client;
