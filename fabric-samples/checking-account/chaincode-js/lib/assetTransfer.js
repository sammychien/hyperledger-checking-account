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
                ID: 'account1',
                Name: 'Uno',
                Balance: 50,
            },
            {
                ID: 'account2',
                Name: 'Dos',
                Balance: 100,
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
            ID: userId,
            Name: name,
            Balance: 0,
        };
        ctx.stub.putState(userId, Buffer.from(JSON.stringify(newAccount)));
        return JSON.stringify(newAccount);
    }

    async accountExists(ctx, accountId) {
        const accountJSON = await ctx.stub.getState(accountId);
        return accountJSON && accountJSON.length > 0;
    }

    async getAccountEntity(ctx) {
        const userId = ctx.clientIdentity.getID();
        const accountJSON = await ctx.stub.getState(userId); // get the asset from chaincode state
        if (!accountJSON || accountJSON.length === 0) {
            throw new Error(`The account ${userId} does not exist`);
        }
        return accountJSON;
    }

    async getAccount(ctx) {
        const accountJSON = await this.getAccountEntity(ctx);
        return accountJSON.toString();
    }

    async deposit(ctx, amount) {
        const userId = ctx.clientIdentity.getID();
        const accountJSON = await this.getAccount(ctx);
        const account = JSON.parse(accountJSON);
        account.Balance = Number(account.Balance) + Number(amount);
        await ctx.stub.putState(userId, Buffer.from(JSON.stringify(account)));
        return JSON.stringify(account);
    }

    async withdraw(ctx, amount) {
        const userId = ctx.clientIdentity.getID();
        const accountJSON = await this.getAccount(ctx);
        const account = JSON.parse(accountJSON);
        if (Number(account.Balance) < Number(amount)) {
            throw new Error(`The client does not have enough money in account to withdraw ${amount}`);
        }
        account.Balance = Number(account.Balance) - Number(amount);
        ctx.stub.putState(userId, Buffer.from(JSON.stringify(account)));
        return JSON.stringify(account);
    }

    async transfer(ctx, recipient, amount) {
        const withdrawResponse = await this.withdraw(ctx, amount);
        const recipientAccountJSON = await ctx.stub.getState(recipient); // get the asset from chaincode state
        const recipientAccount = JSON.parse(recipientAccountJSON.toString());
        if (!recipientAccount || recipientAccount.length === 0) {
            throw new Error(`The account ${recipient} does not exist`);
        }

        recipientAccount.Balance = Number(recipientAccount.Balance) + Number(amount);
        await ctx.stub.putState(recipient, Buffer.from(JSON.stringify(recipientAccount)));
        return withdrawResponse;
    }

    async getBalance(ctx) {
        const account = await this.getAccountEntity(ctx);
        return account.Balance.toString();
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
