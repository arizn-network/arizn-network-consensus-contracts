pragma solidity ^0.4.18;
import '../../contracts/AriznNetworkConsensus.sol';
import '../../contracts/ProxyStorage.sol';
import '../../contracts/interfaces/IProxyStorage.sol';

contract AriznNetworkConsensusMock is AriznNetworkConsensus {
    //For testing
    // address public systemAddress = 0xfffffffffffffffffffffffffffffffffffffffe;
    function AriznNetworkConsensusMock(address _moc, address[] validators) 
        PoaNetworkConsensus(_moc, validators) 
    {}
    function setSystemAddress(address _newAddress) public {
        systemAddress = _newAddress;
    }

    function setProxyStorageMock(address _newAddress) public {
        proxyStorage = ProxyStorage(_newAddress);
    }

    function setMoCMock(address _newAddress) public {
        masterOfCeremony = _newAddress;
    }

    function setIsMasterOfCeremonyInitializedMock(bool _status) public {
        isMasterOfCeremonyInitialized = _status;
    }

    function setCurrentValidatorsLength(uint256 _newNumber) public {
        currentValidatorsLength = _newNumber;
    }
}