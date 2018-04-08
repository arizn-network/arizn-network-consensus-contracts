let AriznNetworkConsensus = artifacts.require('./mockContracts/AriznNetworkConsensusMock');
let ProxyStorageMock = artifacts.require('./mockContracts/ProxyStorageMock');
const ERROR_MSG = 'VM Exception while processing transaction: revert';
require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(web3.BigNumber))
    .should();

contract('AriznNetworkConsensus [all features]', function (accounts) {
    let ariznNetworkConsensus;
    let proxyStorageMock;
    let masterOfCeremony = accounts[0];
    beforeEach(async () => {
        ariznNetworkConsensus = await AriznNetworkConsensus.new(masterOfCeremony, []);
        proxyStorageMock = await ProxyStorageMock.new(ariznNetworkConsensus.address);
        await ariznNetworkConsensus.setProxyStorage(proxyStorageMock.address);
        await proxyStorageMock.initializeAddresses(
            masterOfCeremony,
            masterOfCeremony,
            masterOfCeremony,
            masterOfCeremony,
            masterOfCeremony,
            masterOfCeremony
        );
    });

    describe('default values', async () => {
        it('finalized should be false', async () => {
            let validators = await ariznNetworkConsensus.getValidators();
            let finalized = await ariznNetworkConsensus.finalized();
            validators.should.be.deep.equal([
                masterOfCeremony
            ]);
            finalized.should.be.false;
        });

        it('checks systemAddress', async () => {
            let systemAddress = await ariznNetworkConsensus.systemAddress();
            systemAddress.should.be.equal('0xfffffffffffffffffffffffffffffffffffffffe');
        })
        it('allows you to set current list of validators', async () => {
            let validatorsList = [accounts[2], accounts[3], accounts[4]];
            let arizn = await AriznNetworkConsensus.new(masterOfCeremony, validatorsList);
            let validators = await arizn.getValidators();
            let finalized = await arizn.finalized();
            validators.should.be.deep.equal([
                masterOfCeremony,
                ...validatorsList
            ]);

        })
    })

    describe('#finalizeChange', async () => {
        it('should only be called by systemAddress', async () => {
            await ariznNetworkConsensus.finalizeChange().should.be.rejectedWith(ERROR_MSG);
            await ariznNetworkConsensus.setSystemAddress(accounts[0]);
            await ariznNetworkConsensus.finalizeChange().should.be.fulfilled;
            await ariznNetworkConsensus.finalizeChange().should.be.rejectedWith(ERROR_MSG);
        })
        it('should set finalized to true', async () => {
            let finalized = await ariznNetworkConsensus.finalized();
            finalized.should.be.false;
            await ariznNetworkConsensus.setSystemAddress(accounts[0]);
            await ariznNetworkConsensus.finalizeChange().should.be.fulfilled;
            finalized = await ariznNetworkConsensus.finalized();
            finalized.should.be.true;

        })

        it('should set currentValidators to pendingList', async () => {
            await ariznNetworkConsensus.setSystemAddress(accounts[0]);
            const { logs } = await ariznNetworkConsensus.finalizeChange().should.be.fulfilled;
            let currentValidatorsLength = await ariznNetworkConsensus.currentValidatorsLength();
            let currentValidators = [];
            let pendingList = [];
            for (let i = 0; i < currentValidatorsLength.toNumber(10); i++) {
                let validator = await ariznNetworkConsensus.currentValidators(i);
                currentValidators.push(validator);
                let pending = await ariznNetworkConsensus.pendingList(i);
                pendingList.push(pending);
            }
            currentValidators.should.be.deep.equal(pendingList);
            logs[0].event.should.be.equal('ChangeFinalized');
            logs[0].args.newSet.should.be.deep.equal(currentValidators);
        })

        it('set currentValidators to pendingList after addValidator call', async () => {
            await ariznNetworkConsensus.addValidator(accounts[1], true, {from: accounts[1]}).should.be.rejectedWith(ERROR_MSG);
            await ariznNetworkConsensus.addValidator(accounts[1], true);
            await ariznNetworkConsensus.setSystemAddress(accounts[0]);
            await ariznNetworkConsensus.finalizeChange().should.be.fulfilled;
            let currentValidatorsLength = await ariznNetworkConsensus.currentValidatorsLength();
            let currentValidators = [];
            let pendingList = [];
            for (let i = 0; i < currentValidatorsLength.toNumber(10); i++) {
                let validator = await ariznNetworkConsensus.currentValidators(i);
                currentValidators.push(validator);
                let pending = await ariznNetworkConsensus.pendingList(i);
                pendingList.push(pending);
            }
            currentValidators.should.be.deep.equal(pendingList);
            await ariznNetworkConsensus.addValidator(accounts[2], true);
            await ariznNetworkConsensus.finalizeChange().should.be.fulfilled;
            currentValidatorsLength = await ariznNetworkConsensus.currentValidatorsLength()
            const expected = [masterOfCeremony, accounts[1], accounts[2]];

            currentValidatorsLength = await ariznNetworkConsensus.currentValidatorsLength();
            currentValidators = [];
            pendingList = [];
            for (let i = 0; i < currentValidatorsLength.toNumber(10); i++) {
                let validator = await ariznNetworkConsensus.currentValidators(i);
                currentValidators.push(validator);
                let pending = await ariznNetworkConsensus.pendingList(i);
                pendingList.push(pending);
            }
            expected.should.be.deep.equal(pendingList);
            expected.should.be.deep.equal(currentValidators);
        })
    })

    describe('#addValidator', async () => {
        it('should be called only from keys manager', async () => {
            await ariznNetworkConsensus.addValidator(accounts[1], true, {from: accounts[2]}).should.be.rejectedWith(ERROR_MSG);
            await proxyStorageMock.setKeysManagerMock(accounts[5]);
            await ariznNetworkConsensus.addValidator(accounts[1], true, {from: accounts[5]}).should.be.fulfilled;
        })

        it('should not allow to add already existing validator', async () => {
            await proxyStorageMock.setKeysManagerMock(accounts[0]);
            await ariznNetworkConsensus.addValidator(accounts[1], true).should.be.fulfilled;
            await ariznNetworkConsensus.addValidator(accounts[1], true).should.be.rejectedWith(ERROR_MSG);
        })

        it('should not allow 0x0 addresses', async () => {
            await proxyStorageMock.setKeysManagerMock(accounts[0]);
            await ariznNetworkConsensus.addValidator('0x0', true).should.be.rejectedWith(ERROR_MSG);
            await ariznNetworkConsensus.addValidator('0x0000000000000000000000000000000000000000', true).should.be.rejectedWith(ERROR_MSG);
        })

        it('should set validatorsState for new validator', async () => {
            await proxyStorageMock.setKeysManagerMock(accounts[0]);
            await ariznNetworkConsensus.addValidator(accounts[1], true).should.be.fulfilled;
            let state = await ariznNetworkConsensus.validatorsState(accounts[1]);
            let pendingList = await ariznNetworkConsensus.getPendingList();
            state[0].should.be.true;
            state[1].should.be.bignumber.equal(pendingList.length - 1)
        })

        it('should set finalized to false', async () => {
            await proxyStorageMock.setKeysManagerMock(accounts[0]);
            await ariznNetworkConsensus.addValidator(accounts[1], true).should.be.fulfilled;
            let finalized = await ariznNetworkConsensus.finalized();
            finalized.should.be.false;
        })

        it('should emit InitiateChange with blockhash and pendingList as params', async () => {
            await proxyStorageMock.setKeysManagerMock(accounts[0]);
            const {logs} = await ariznNetworkConsensus.addValidator(accounts[1], true).should.be.fulfilled;
            let currentValidatorsLength = await ariznNetworkConsensus.currentValidatorsLength();
            let currentValidators = [];
            for (let i = 0; i < currentValidatorsLength.toNumber(10); i++) {
                let validator = await ariznNetworkConsensus.currentValidators(i);
                currentValidators.push(validator);
            }
            currentValidators.push(accounts[1]);
            logs[0].args['newSet'].should.deep.equal(currentValidators);  
            logs[0].event.should.be.equal('InitiateChange');
        })
    })

    describe('#removeValidator', async () => {
        it('should remove validator', async () => {
            await proxyStorageMock.setKeysManagerMock(accounts[0]);
            await ariznNetworkConsensus.addValidator(accounts[1], true).should.be.fulfilled;
            await ariznNetworkConsensus.removeValidator(accounts[1], true).should.be.fulfilled;
        })

        it('should be called only from keys manager', async () => {
            await ariznNetworkConsensus.removeValidator(accounts[1],true).should.be.rejectedWith(ERROR_MSG);
            await proxyStorageMock.setKeysManagerMock(accounts[0]);
            await ariznNetworkConsensus.addValidator(accounts[1], true).should.be.fulfilled;
            await ariznNetworkConsensus.removeValidator(accounts[1],true).should.be.fulfilled;
        })

        it('should only be allowed to remove from existing set of validators', async () => {
            await proxyStorageMock.setKeysManagerMock(accounts[0]);
            await ariznNetworkConsensus.removeValidator(accounts[1],true).should.be.rejectedWith(ERROR_MSG);
        })

        it('should decrease length of pendingList', async () => {
            await proxyStorageMock.setKeysManagerMock(accounts[0]);
            await ariznNetworkConsensus.addValidator(accounts[1], true).should.be.fulfilled;
            await ariznNetworkConsensus.setSystemAddress(accounts[0]);
            await ariznNetworkConsensus.finalizeChange().should.be.fulfilled;
            await ariznNetworkConsensus.addValidator(accounts[2], true).should.be.fulfilled;
            await ariznNetworkConsensus.finalizeChange().should.be.fulfilled;
            let currentValidatorsLength = await ariznNetworkConsensus.currentValidatorsLength();
            let pendingList = [];
            for(let i = 0; i < currentValidatorsLength; i++){
                let pending = await ariznNetworkConsensus.pendingList(i);
                pendingList.push(pending);
            }
            const indexOfRemovedElement = pendingList.indexOf(accounts[1]);
            pendingList.splice(indexOfRemovedElement, 1);
            const { logs } = await ariznNetworkConsensus.removeValidator(accounts[1],true).should.be.fulfilled;
            let pendingListFromContract = logs[0].args['newSet'];
            pendingListFromContract.length.should.be.equal(currentValidatorsLength.toNumber(10) - 1);
            pendingList.should.be.deep.equal(pendingListFromContract);
            logs[0].event.should.be.equal('InitiateChange');
            const expected = [masterOfCeremony, accounts[2]];
            expected.should.be.deep.equal(pendingList);
        })

        it('should change validatorsState', async () => {
            await proxyStorageMock.setKeysManagerMock(accounts[0]);
            await ariznNetworkConsensus.addValidator(accounts[1], true).should.be.fulfilled;
            await ariznNetworkConsensus.removeValidator(accounts[1],true).should.be.fulfilled;
            const state = await ariznNetworkConsensus.validatorsState(accounts[1]);
            state[0].should.be.false;
            state[1].should.be.bignumber.equal(0);
        })

        it('should set finalized to false', async () => {
            await proxyStorageMock.setKeysManagerMock(accounts[0]);
            await ariznNetworkConsensus.addValidator(accounts[1], true).should.be.fulfilled;
            await ariznNetworkConsensus.removeValidator(accounts[1],true).should.be.fulfilled;
            const finalized = await ariznNetworkConsensus.finalized();
            finalized.should.be.false;
        })
    });

    describe('#setProxyStorage', async () => {
        let new_masterOfCeremony = accounts[1];
        const nonValidator = accounts[3];
        let validator = accounts[0];
        it('can be called by any validator', async () => {
            await ariznNetworkConsensus.setIsMasterOfCeremonyInitializedMock(false);
            await ariznNetworkConsensus.setProxyStorage(nonValidator, {from: accounts[6]}).should.be.rejectedWith(ERROR_MSG);
            await ariznNetworkConsensus.setProxyStorage(accounts[5], {from: validator}).should.be.fulfilled;
        })
        it('can only be called once', async () => {
            // we already call it in the beforeEach block, hence why I expect it to be rejected
            await ariznNetworkConsensus.setProxyStorage(nonValidator, {from: nonValidator}).should.be.rejectedWith(ERROR_MSG);
        })
        it('cannot be set to 0x0 address', async () => {
            await ariznNetworkConsensus.setIsMasterOfCeremonyInitializedMock(false);
            await ariznNetworkConsensus.setProxyStorage('0x0000000000000000000000000000000000000000', {from: validator}).should.be.rejectedWith(ERROR_MSG);
        })
        it('sets proxyStorage', async () => {
            let newProxyStorage = accounts[3];
            await ariznNetworkConsensus.setIsMasterOfCeremonyInitializedMock(false);
            await ariznNetworkConsensus.setProxyStorage(newProxyStorage, {from: validator}).should.be.fulfilled;
            (await ariznNetworkConsensus.proxyStorage()).should.be.equal(newProxyStorage);
        })
        it('sets isMasterOfCeremonyInitialized', async () => {
            let newProxyStorage = accounts[3];
            await ariznNetworkConsensus.setIsMasterOfCeremonyInitializedMock(false);
            await ariznNetworkConsensus.setProxyStorage(newProxyStorage, {from: validator}).should.be.fulfilled;
            (await ariznNetworkConsensus.isMasterOfCeremonyInitialized()).should.be.equal(true);
        })

        it('emits MoCInitializedProxyStorage', async () => {
            let newProxyStorage = accounts[3];
            await ariznNetworkConsensus.setIsMasterOfCeremonyInitializedMock(false);
            const {logs} = await ariznNetworkConsensus.setProxyStorage(newProxyStorage, {from: validator}).should.be.fulfilled;
            logs[0].event.should.be.equal('MoCInitializedProxyStorage');
            logs[0].args.proxyStorage.should.be.equal(newProxyStorage);
        })
        it('#getKeysManager', async () => {
            let newKeysManager = accounts[3];
            await ariznNetworkConsensus.setIsMasterOfCeremonyInitializedMock(false);
            await proxyStorageMock.setKeysManagerMock(newKeysManager);
            (await ariznNetworkConsensus.getKeysManager()).should.be.equal(newKeysManager);
        })
        it('#getVotingToChangeKeys', async () => {
            let newVotingToChangeKeys = accounts[3];
            await ariznNetworkConsensus.setIsMasterOfCeremonyInitializedMock(false);
            await proxyStorageMock.setVotingContractMock(newVotingToChangeKeys);
            (await ariznNetworkConsensus.getVotingToChangeKeys()).should.be.equal(newVotingToChangeKeys);
        })
    })
    describe('#isValidator', async () => {
        it('returns address of miner', async () => {
            (await ariznNetworkConsensus.isValidator(masterOfCeremony)).should.be.equal(true);
            (await ariznNetworkConsensus.isValidator(accounts[2])).should.be.equal(false);
        })
    })
});