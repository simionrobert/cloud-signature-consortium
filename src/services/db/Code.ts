import mongoose, {Schema,Document} from 'mongoose';

export interface ICode extends Document{
    value: String

    // oauth2/authorize
    scope: String,
    user_id: String,
    client_id: String,
    redirect_uri: String,

    // for credentials/authorize 
    credential_id: String,
    hashes: String[],
    num_signatures: String,

    creation_date: Date
};

const CodeSchema :Schema= new Schema({
    value: { type: String, unique: true },

    // oauth2/authorize
    scope: String,
    user_id: String,
    client_id: String,
    redirect_uri: String,

    // for credentials/authorize 
    credential_id: String,
    hashes: [String],
    num_signatures: Number,

    creation_date: { type: Date, default: Date.now() }
});

const Code =mongoose.model<ICode>('codes', CodeSchema);

export default Code; 