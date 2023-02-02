// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.0;

import "../libraries/FixedPointMathLib.sol";
import "../interfaces/IMetaAlgorithm.sol";

contract LinearAlgorithm is IMetaAlgorithm, AlgorithmErrors {

    using FixedPointMathLib for uint256;

    function validateStartPrice( uint ) external pure override returns( bool ) {

        return true;

    }

    function validateDelta( uint ) external pure override returns( bool ) {

        return true;

    }

    function getBuyInfo( uint128 _multiplier, uint128 _startPrice, uint _numItems, uint128 _protocolFee, uint128 _poolFee ) external pure override 
        returns ( 
            bool isValid, 
            uint128 newStartPrice, 
            uint128 newDelta, 
            uint256 inputValue, 
            uint256 protocolFee 
        ) {

        if ( _numItems == 0 ) 
            return (false, 0, 0, 0, 0);

        uint _newStartPrice = _startPrice + ( _multiplier * _numItems );
        
        if( _newStartPrice > type( uint128 ).max )
            return ( false, 0, 0, 0, 0);

        uint256 buyPrice = _startPrice + _multiplier;

        inputValue = 
            _numItems * buyPrice + ( _numItems * ( _numItems - 1 ) * _multiplier ) / 2;

        // update ( Fees )

        uint poolFee = inputValue.fmul( _poolFee, FixedPointMathLib.WAD);

        protocolFee = inputValue.fmul( _protocolFee, FixedPointMathLib.WAD);

        inputValue += ( protocolFee + poolFee );

        newStartPrice = uint128(_newStartPrice);

        newDelta = _multiplier;

        isValid = true;

    }

    function getSellInfo( uint128 _multiplier, uint128 _startPrice, uint _numItems, uint128 _protocolFee, uint128 _poolFee ) external pure override
        returns ( 
            bool isValid, 
            uint128 newStartPrice, 
            uint128 newDelta, 
            uint256 outputValue, 
            uint256 protocolFee 
        ) {

        if ( _numItems == 0 ) 
            return (false, 0, 0, 0, 0);

        uint decrease = _multiplier * _numItems;

        if( _startPrice < decrease ){

            newStartPrice = 0;

            _numItems = _startPrice / _multiplier + 1;

        }

        else newStartPrice = _startPrice - uint128( decrease );

        outputValue = _numItems * _startPrice - ( _numItems * ( _numItems - 1 ) * _multiplier ) / 2;

        // update ( Fees )

        uint poolFee = outputValue.fmul( _poolFee, FixedPointMathLib.WAD);

        protocolFee = outputValue.fmul( _protocolFee, FixedPointMathLib.WAD);

        outputValue -= ( protocolFee + poolFee );

        newDelta = _multiplier;

        isValid = true;

    }
    
}