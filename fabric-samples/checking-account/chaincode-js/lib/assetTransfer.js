/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');

class AssetTransfer extends Contract {

    async InitLedger(ctx) {
        const assets = [
            {
                id: 'account1',
                name: 'Uno',
                balance: 50,
            },
            {
                id: 'account2',
                name: 'Dos',
                balance: 100,
            }
        ];

        for (const asset of assets) {
            asset.docType = 'asset';
            await ctx.stub.putState(asset.ID, Buffer.from(JSON.stringify(asset)));
            console.info(`Asset ${asset.ID} initialized`);
        }
    }

    // CreateAsset issues a new asset to the world state with given details.
    async CreateAsset(ctx, id, color, size, owner, appraisedValue) {
        const asset = {
            ID: id,
            Color: color,
            Size: size,
            Owner: owner,
            AppraisedValue: appraisedValue,
        };
        ctx.stub.putState(id, Buffer.from(JSON.stringify(asset)));
        return JSON.stringify(asset);
    }

    // ReadAsset returns the asset stored in the world state with given id.
    async ReadAsset(ctx, id) {
        const assetJSON = await ctx.stub.getState(id); // get the asset from chaincode state
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return assetJSON.toString();
    }

    // UpdateAsset updates an existing asset in the world state with provided parameters.
    async UpdateAsset(ctx, id, color, size, owner, appraisedValue) {
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }

        // overwriting original asset with new asset
        const updatedAsset = {
            ID: id,
            Color: color,
            Size: size,
            Owner: owner,
            AppraisedValue: appraisedValue,
        };
        return ctx.stub.putState(id, Buffer.from(JSON.stringify(updatedAsset)));
    }

    // DeleteAsset deletes an given asset from the world state.
    async DeleteAsset(ctx, id) {
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return ctx.stub.deleteState(id);
    }

    // AssetExists returns true when asset with given ID exists in world state.
    async AssetExists(ctx, id) {
        const assetJSON = await ctx.stub.getState(id);
        return assetJSON && assetJSON.length > 0;
    }

    // TransferAsset updates the owner field of asset with given id in the world state.
    async TransferAsset(ctx, id, newOwner) {
        const assetString = await this.ReadAsset(ctx, id);
        const asset = JSON.parse(assetString);
        asset.Owner = newOwner;
        return ctx.stub.putState(id, Buffer.from(JSON.stringify(asset)));
    }

    // GetAllAssets returns all assets found in the world state.
    async GetAllAssets(ctx) {
        const allResults = [];
        // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push({ Key: result.value.key, Record: record });
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }

    /**
     * Below are the functions necessary for checking account
     * 
     */

    async createAccount(ctx, name) {
        const userId = ctx.clientIdentity.getID();
        const newAccount = {
            id: userId,
            name: name,
            balance: 0,
        }
        ctx.stub.putState(userId, Buffer.from(JSON.stringify(newAccount)));
        return JSON.stringify(asset);
    }

    async getAccount(ctx) {
        const userId = ctx.clientIdentity.getID();
        const assetJSON = await ctx.stub.getState(userId); // get the asset from chaincode state
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return assetJSON.toString();
    }

    async deposit(ctx, amount) {
        const userId = ctx.clientIdentity.getID();
        const accountJSON = getAccount(ctx);
        const account = JSON.parse(accountJSON);
        account.balance = account.balance + amount;
        return ctx.stub.putState(userId, Buffer.from(JSON.stringify(account)));
    }

    async withdraw(ctx, amount) {
        const userId = ctx.clientIdentity.getID();
        const accountJSON = getAccount(ctx);
        const account = JSON.parse(accountJSON);
        if (account.balance < amount) {
            throw new Error(`The client does not have enough money in account to withdraw ${amount}`);
        }
        account.balance = account.balance - amount;
        return ctx.stub.putState(userId, Buffer.from(JSON.stringify(account)));
    }

    async transfer(ctx, recipient, amount) {
        const withdrawResponse = await this.withdraw(ctx, amount);
        const recipientAccount = await ctx.stub.getState(recipient); // get the asset from chaincode state
        if (!recipientAccount || recipientAccount.length === 0) {
            throw new Error(`The asset ${id} does not exist`);
        }

        recipientAccount.balance = recipientAccount.balance + amount;
        await ctx.stub.putState(recipientAccount, Buffer.from(JSON.stringify(recipientAccount)));
        return withdrawResponse;
    }
    
    async getBalance(ctx) {
        const accountJSON = await getAccount(ctx);
        const account = JSON.parse(accountJSON);
        return account.balance.toString();
    }

    async authorizeThirdParty(ctx, thirdParty, numUses) {
        /**
         * @inputs
         * thirdParty: uuid
         * 
         * 
         * Get account from user,
         * 
         * append the third party uuid to a new map in the user account
         * called 'keys'
         * key is third party uuid, value is numUses
         * 
         */
        
    }

    async verificationRequest(ctx, targetAccount, amount, authKey) {
        /**
         * Get target account,
         * make sure authKey is in 'keys'
         * decrease numUses by one,
         * return simple boolean, numUses of the auth key left
         * 
         */

    }


}

module.exports = AssetTransfer;
