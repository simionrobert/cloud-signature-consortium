import mongoose, {Schema,Document} from 'mongoose';

export interface IToken extends Document{
    value: String
    type: String, // access_token or refresh_token
    user_id: String,
    client_id: String,
    creation_date: Date // the date of creation of the token

};

const TokenSchema:Schema = new Schema({
    value: { type: String, unique: true },
    type: String, // access_token or refresh_token
    user_id: String,
    client_id: String,
    creation_date: { type: Date, default: Date.now() } // the date of creation of the token
});

export default mongoose.model<IToken>('tokens', TokenSchema);