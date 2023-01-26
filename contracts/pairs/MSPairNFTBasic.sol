// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "../libraries/Arrays.sol";
import "./MSPairBasic.sol";

contract MSPairNFTBasic is MSPairBasic, IERC721Receiver {

    using Arrays for uint[];

    uint[] private _TOKEN_IDS;

    function _sendNFTsTo( address _from, address _to, uint[] calldata _tokenIDs ) internal override {

        IERC721 _NFT = IERC721( NFT );

        for (uint256 i = 0; i < _tokenIDs.length; i++) {

            _NFT.safeTransferFrom(_from, _to, _tokenIDs[i]);

            ( uint index, bool isIncluded ) = _tokenIDs.indexOf( _tokenIDs[i] );

            if( _to != address( this ) && isIncluded ) delete _TOKEN_IDS[ index ];

        }

    }

    function _sendAnyOutNFTs( address _to, uint _numNFTs ) internal override {

        IERC721 _NFT = IERC721( NFT );

        for (uint256 i = 0; i < _numNFTs - 1; i++) {

            _NFT.safeTransferFrom( address( this ), _to, _TOKEN_IDS[i]);

            delete _TOKEN_IDS[i];

        }

    }

    function onERC721Received(address, address, uint256 id, bytes calldata) external override returns (bytes4) {

        if( NFT == msg.sender ) _TOKEN_IDS.push(id);

        return IERC721Receiver.onERC721Received.selector;

    }

    function getNFTIds() public override view returns ( uint[] memory nftIds) {

        nftIds = _TOKEN_IDS;

    }

    function withdrawNFTs( IERC721 _nft, uint[] memory _nftIds ) external override onlyOwner {

        IERC721 poolNFT = IERC721( NFT );

        if( _nft == poolNFT ){

            for (uint256 i = 0; i < _nftIds.length; i++) {

                poolNFT.safeTransferFrom( address( this ), owner(), _nftIds[i]);

                delete _TOKEN_IDS[ _nftIds[i] ];

            }

        } else {

            for (uint256 i = 0; i < _nftIds.length; i++) 

                _nft.safeTransferFrom( address( this ), owner(), _nftIds[i]);

        }

    }

}