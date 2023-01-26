const {
    time,
    loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const {
    poolType, 
    createPair, 
    getEventLog, 
    mintNFT, 
    sendBulkNfts,
    getNumber,
    getTokenInput,
    deployMetaFactory
} = require("../utils/tools" )
const { expect } = require("chai");
const { ethers } = require("hardhat");
const provider = ethers.provider

describe("MetaPairs", function () {

    describe("init", () => {

        describe(" - Errors", () => {

            it("1. should fail if is called after initialation", async () => {

                const { metaFactory, nft, linearCurve, otherAccount } = await loadFixture(deployMetaFactory)

                const { pair } = await createPair( metaFactory, nft, 0, 1, 0.5, linearCurve, poolType.token, 0, 10)
                
                await expect( 
                    pair.init(
                    2,
                    40000,
                    otherAccount.address,
                    otherAccount.address,
                    nft.address,
                    500000,
                    linearCurve.address,
                    poolType.token
                )).to.be.revertedWith( "it is already initialized" )

            })

        })

        describe(" - Functionalities", () => {

            it("1. factory should create a new pair type NFT", async () => {

                const { metaFactory, nft, owner, linearCurve } = await loadFixture(deployMetaFactory)

                const nftIds = await mintNFT(nft, 10, metaFactory)

                const spotPrice = ethers.utils.parseEther("1")

                const tx = await metaFactory.createPair(
                    nft.address,
                    nftIds,
                    spotPrice.div(2),
                    spotPrice,
                    owner.address,
                    0,
                    linearCurve.address,
                    poolType.nft
                )


                const newPairInfo = await getEventLog( tx, "NewPair" )

                expect( ethers.utils.isAddress( newPairInfo.pair ) ).to.be.true
                expect( newPairInfo.owner ).to.be.equal( owner.address )

            })

            it("2. check initial info for NFT pair", async() => {

                const { metaFactory, nft, linearCurve, owner } = await loadFixture( deployMetaFactory )

                const { pair } = await createPair( metaFactory, nft, 10, 1, 0.5, linearCurve, poolType.nft, 0, 0)

                const nftBalance = await nft.balanceOf( pair.address )

                expect( nftBalance ).to.be.equal( 10 )

                // check delta 
                
                expect( await pair.delta() ).to.be.equal( ethers.utils.parseEther("0.5") )

                // check spotPrice 
                
                expect( await pair.spotPrice() ).to.be.equal( ethers.utils.parseEther("1") )

                // check trade fee
                
                expect( await pair.tradeFee() ).to.be.equal( 0 )

                // check rewards recipent
                
                expect( await pair.rewardsRecipent() ).to.be.equal( owner.address )

                // check nft collection address
                
                expect( await pair.NFT() ).to.be.equal( nft.address )

                // check the pair factory
                
                expect( await pair.factory() ).to.be.equal( metaFactory.address )

                // check poolType
                
                expect( await pair.currentPoolType() ).to.be.equal( poolType.nft )

                // check the prices curve
                
                expect( await pair.curve() ).to.be.equal( linearCurve.address )

            })

            it("3. check initial info for token pair", async() => {

                const { metaFactory, nft, exponencialCurve, owner } = await loadFixture( deployMetaFactory )

                const { pair } = await createPair( metaFactory, nft, 0, 1, 1.5, exponencialCurve, poolType.token, 0, 10)

                const tokenBalance = await provider.getBalance( pair.address )

                expect( tokenBalance ).to.be.equal( ethers.utils.parseEther("10") )

                // check delta 
                
                expect( await pair.delta() ).to.be.equal( ethers.utils.parseEther("1.5") )

                // check spotPrice 
                
                expect( await pair.spotPrice() ).to.be.equal( ethers.utils.parseEther("1") )

                // check trade fee
                
                expect( await pair.tradeFee() ).to.be.equal( 0 )

                // check rewards recipent
                
                expect( await pair.rewardsRecipent() ).to.be.equal( owner.address )

                // check nft collection address
                
                expect( await pair.NFT() ).to.be.equal( nft.address )

                // check the pair factory
                
                expect( await pair.factory() ).to.be.equal( metaFactory.address )

                // check poolType
                
                expect( await pair.currentPoolType() ).to.be.equal( poolType.token )

                // check the prices curve
                
                expect( await pair.curve() ).to.be.equal( exponencialCurve.address )


            })

            it("4. check initial info for trade pair", async() => {

                const { metaFactory, nft, cPCurve } = await loadFixture( deployMetaFactory )

                const { pair } = await createPair( metaFactory, nft, 10, 1, 0.5, cPCurve, poolType.trade, 0.1, 10 )

                const nftBalance = await nft.balanceOf( pair.address )

                const tokenBalance = await provider.getBalance( pair.address )

                expect( tokenBalance ).to.be.equal( ethers.utils.parseEther("10") )

                expect( nftBalance ).to.be.equal( 10 )

                // check delta 
                
                expect( await pair.delta() ).to.be.equal( ethers.utils.parseEther("0.5") )

                // check spotPrice 
                
                expect( await pair.spotPrice() ).to.be.equal( ethers.utils.parseEther("1") )

                // check trade fee
                
                expect( await pair.tradeFee() ).to.be.equal( ethers.utils.parseEther("0.1") )

                // check rewards recipent
                
                expect( await pair.rewardsRecipent() ).to.be.equal( ethers.constants.AddressZero )

                // check nft collection address
                
                expect( await pair.NFT() ).to.be.equal( nft.address )

                // check the pair factory
                
                expect( await pair.factory() ).to.be.equal( metaFactory.address )

                // check poolType
                
                expect( await pair.currentPoolType() ).to.be.equal( poolType.trade )

                // check the prices curve
                
                expect( await pair.curve() ).to.be.equal( cPCurve.address )


            })

        })

    })

    describe("swap NFTs For Token", () => {

        describe(" - Errors", () => {

            it("1. should fail if pair is type NFT", async () => {

                const { metaFactory, nft, linearCurve, owner } = await loadFixture(deployMetaFactory)

                const minExpected = ethers.utils.parseEther("2")

                const { pair, tokenIds } = await createPair( metaFactory, nft, 10, 1, 0.5, linearCurve, poolType.nft, 0, 0)
                
                await expect( 
                    pair.swapNFTsForToken( 
                        [ tokenIds[0] ],
                        minExpected,
                        owner.address
                    )
                ).to.be.revertedWith( "invalid pool Type" )

            })

            it("2. should fail if pass cero items", async () => {

                const { metaFactory, nft, linearCurve, owner } = await loadFixture(deployMetaFactory)

                const minExpected = ethers.utils.parseEther("1")

                const { pair } = await createPair( metaFactory, nft, 10, 1, 0.5, linearCurve, poolType.token, 0, 0)
                
                await expect( 
                    pair.swapNFTsForToken( 
                        [],
                        minExpected,
                        owner.address
                    )
                ).to.be.reverted

            })

            it("3. should fail if exceeds max expecteed", async () => {

                const { metaFactory, nft, linearCurve, owner } = await loadFixture(deployMetaFactory)

                const minExpected = ethers.utils.parseEther("1")

                const { pair, tokenIds } = await createPair( metaFactory, nft, 10, 1, 0.5, linearCurve, poolType.token, 0, 10)
                
                await expect( 
                    pair.swapNFTsForToken( 
                        [ tokenIds[0] ],
                        minExpected,
                        owner.address
                    )
                ).to.be.revertedWith( "output amount is les than min espected" )

            })

            it("3. should fail if user doesn't have the nft", async () => {

                const { metaFactory, nft, linearCurve, owner } = await loadFixture(deployMetaFactory)

                const minExpected = ethers.utils.parseEther("1")

                const { pair } = await createPair( metaFactory, nft, 10, 1, 0.5, linearCurve, poolType.token, 0, 10)
                
                await expect( 
                    pair.swapNFTsForToken( 
                        [ 1 ],
                        minExpected,
                        owner.address
                    )
                ).to.be.reverted

            })

        })

        describe(" - Functionalities", () => {

            it("1. should swap NFTs to token", async () => {

                const { metaFactory, nft, linearCurve, owner } = await loadFixture(deployMetaFactory)

                const minExpected = ethers.utils.parseEther("0.9")

                const { pair, tokenIds } = await createPair( metaFactory, nft, 10, 1, 0.5, linearCurve, poolType.token, 0, 10)

                const idsBefore = await pair.getNFTIds()

                expect( idsBefore.length ).to.be.equal( 0 )

                const ownerBalanceBefore = await owner.getBalance()
                
                const tx = await pair.swapNFTsForToken( [ tokenIds[0] ], minExpected, owner.address )

                const ownerBalanceAfter = await owner.getBalance()

                const { amoutOut } = await getEventLog( tx, "SellLog")

                const idsAfter = await pair.getNFTIds()

                const nftOwner = await nft.ownerOf( tokenIds[0] )

                expect( 
                    Math.floor( 
                        getNumber(ownerBalanceBefore.add( amoutOut ))) 
                    ).to.be.equal( 
                        Math.floor( getNumber(ownerBalanceAfter))
                        )

                expect( nftOwner ).to.be.equal( pair.address )

                expect( idsAfter[ 0 ].toNumber() ).to.be.equal( tokenIds[0] )

            })

        })

    })

    describe("swap token For especific NFTs", () => {

        describe(" - Errors", () => {

            it("1. should fail if poolType is token", async () => {

                const { metaFactory, nft, exponencialCurve, owner } = await loadFixture(deployMetaFactory)

                const maxEspected = ethers.utils.parseEther("10")

                const { pair, tokenIds } = await createPair( metaFactory, nft, 10, 1, 1.5, exponencialCurve, poolType.token, 0, 0)
                
                await expect( 
                    pair.swapTokenForNFT(
                        [ tokenIds[0] ],
                        maxEspected,
                        owner.address
                    )
                ).to.be.revertedWith("invalid pool Type")

            })

            it("2. should fail if in curve error", async () => {

                const { metaFactory, nft, exponencialCurve, owner } = await loadFixture(deployMetaFactory)

                const maxEspected = ethers.utils.parseEther("10")

                const { pair } = await createPair( metaFactory, nft, 10, 1, 1.5, exponencialCurve, poolType.nft, 0, 0)
                
                await expect( 
                    pair.swapTokenForNFT(
                        [],
                        maxEspected,
                        owner.address
                    )
                ).to.be.revertedWith("curve Error")

            })

            it("3. should fail if output amount is less than expected", async () => {

                const { metaFactory, nft, exponencialCurve, owner } = await loadFixture(deployMetaFactory)

                const maxEspected = ethers.utils.parseEther("1.5")

                const { pair, tokenIds } = await createPair( metaFactory, nft, 10, 1, 1.5, exponencialCurve, poolType.nft, 0, 0)
                
                await expect( 
                    pair.swapTokenForNFT(
                        [ tokenIds[0] ],
                        maxEspected,
                        owner.address
                    )
                ).to.be.revertedWith("output amount is less than min espected")


            })

            it("4. should fail if pass less amount of ETH than needed", async () => {

                const { metaFactory, nft, exponencialCurve, owner } = await loadFixture(deployMetaFactory)

                const maxEspected = ethers.utils.parseEther("1.6")

                const { pair, tokenIds } = await createPair( metaFactory, nft, 10, 1, 1.5, exponencialCurve, poolType.nft, 0, 0)
                
                await expect( 
                    pair.swapTokenForNFT(
                        [ tokenIds[0] ],
                        maxEspected,
                        owner.address
                    )
                ).to.be.revertedWith("insufficent amount of ETH")


            })

        })

        describe(" - Functionalities", () => {

            it("1. should swap a amount of tokens ", async () => {

                const { metaFactory, nft, owner, exponencialCurve } = await loadFixture(deployMetaFactory)

                const maxEspected = ethers.utils.parseEther("1.6")

                const spotPrice = 1

                const delta = 1.5

                const { pair, tokenIds } = await createPair( metaFactory, nft, 10, spotPrice, delta, exponencialCurve, poolType.nft, 0, 0)

                const espectedInput = getTokenInput("exponencialCurve", spotPrice, delta, 1)

                const ownerBalanceBefore = await owner.getBalance()

                const pairBalanceBefore = await provider.getBalance( pair.address )

                expect( pairBalanceBefore ).to.be.equal( 0 )

                const tx = await pair.swapTokenForNFT(
                    [ tokenIds[0] ],
                    maxEspected,
                    owner.address,
                    { value: maxEspected }
                )

                const ownerBalanceAfer = await owner.getBalance()

                const pairBalanceAfter = await provider.getBalance( pair.address )

                const { amoutIn } = await getEventLog( tx, "BuyLog")

                expect( espectedInput ).to.be.equal( getNumber( pairBalanceAfter ) )

                expect( getNumber( amoutIn ) ).to.be.equal( espectedInput )

                expect( 
                    Math.floor( getNumber( ownerBalanceBefore ) ) 
                ).to.be.equal(
                    Math.floor( getNumber( ownerBalanceAfer.add( amoutIn ) ) )
                 )

            })

            it("2. should should pay a fee", async () => {

                const { metaFactory, nft, owner, cPCurve } = await loadFixture(deployMetaFactory)

                const maxEspected = ethers.utils.parseEther("3")

                const nftAmount = 10

                const spotPrice = nftAmount + 1 // token balance ( nftAmount + 1)

                const delta = nftAmount * 1   // nft balance ( nftAmount * startPrice )

                const { pair, tokenIds } = await createPair( metaFactory, nft, nftAmount, spotPrice, delta, cPCurve, poolType.nft, 0, 0)

                const espectedInput = getTokenInput( "cPCurve", spotPrice, delta, 2 )

                const fee = getNumber( await metaFactory.PROTOCOL_FEE() )

                const feeRecipient = await metaFactory.PROTOCOL_FEE_RECIPIENT()

                const recipientBalanceBefore = getNumber( await provider.getBalance( feeRecipient ))

                await pair.swapTokenForNFT(
                    [ tokenIds[0], tokenIds[1] ],
                    maxEspected,
                    owner.address,
                    { value: maxEspected }
                )

                const recipientBalanceAfter = getNumber( await provider.getBalance( feeRecipient ))

                expect( espectedInput * fee ).to.be.equal( recipientBalanceAfter - recipientBalanceBefore )

            })

        })

    })

    describe("swap token For any NFTs", () => {

        describe(" - Errors", () => {
            
            it("1. should fail if poolType is token", async () => {

                const { metaFactory, nft, linearCurve, owner } = await loadFixture(deployMetaFactory)

                const maxEspected = ethers.utils.parseEther("10")

                const spotPrice = 1

                const delta = 0.5

                const { pair } = await createPair( metaFactory, nft, 10, spotPrice, delta, linearCurve, poolType.token, 0, 0)
                
                await expect( 
                    pair.swapTokenForAnyNFT(
                        3,
                        maxEspected,
                        owner.address
                    )
                ).to.be.revertedWith("invalid pool Type")

            })

            it("2. should fail if in curve error", async () => {

                const { metaFactory, nft, exponencialCurve, owner } = await loadFixture(deployMetaFactory)

                const maxEspected = ethers.utils.parseEther("10")

                const spotPrice = 1

                const delta = 1.5

                const { pair } = await createPair( metaFactory, nft, 10, spotPrice, delta, exponencialCurve, poolType.nft, 0, 0)
                
                await expect( 
                    pair.swapTokenForAnyNFT(
                        0,
                        maxEspected,
                        owner.address
                    )
                ).to.be.revertedWith("curve Error")

            })

            it("3. should fail if output amount is less than expected", async () => {

                const { metaFactory, nft, cPCurve, owner } = await loadFixture(deployMetaFactory)

                const maxEspected = ethers.utils.parseEther("2.7")

                const numItem = 10

                const spotPrice = numItem + 1

                const delta = numItem * 1

                const { pair } = await createPair( metaFactory, nft, numItem, spotPrice, delta, cPCurve, poolType.nft, 0, 0)
                
                await expect( 
                    pair.swapTokenForAnyNFT(
                        2,
                        maxEspected,
                        owner.address
                    )
                ).to.be.revertedWith("output amount is less than min espected")


            })

            it("4. should fail if pass less amount of ETH than needed", async () => {

                const { metaFactory, nft, exponencialCurve, owner } = await loadFixture(deployMetaFactory)

                const maxEspected = ethers.utils.parseEther("10")

                const spotPrice = 1

                const delta = 1.5

                const { pair } = await createPair( metaFactory, nft, 10, spotPrice, delta, exponencialCurve, poolType.nft, 0, 0)
                
                await expect( 
                    pair.swapTokenForAnyNFT(
                        2,
                        maxEspected,
                        owner.address
                    )
                ).to.be.revertedWith("insufficent amount of ETH")

            })

            it("5. should fail if tries to buy more than owns", async () => {

                const { metaFactory, nft, cPCurve, owner } = await loadFixture(deployMetaFactory)

                const maxEspected = ethers.utils.parseEther("10")

                const numItem = 10

                const spotPrice = numItem + 1

                const delta = numItem * 1

                const { pair } = await createPair( metaFactory, nft, numItem, spotPrice, delta, cPCurve, poolType.nft, 0, 0)
                
                await expect( 
                    pair.swapTokenForAnyNFT(
                        11,
                        maxEspected,
                        owner.address,
                        { value: maxEspected.mul( 10 ) }
                    )
                ).to.be.revertedWith( "curve Error" )

            })

        })

        describe(" - Functionalities", () => {

            it("1. should swap a amount of tokens ", async () => {

                const { metaFactory, nft, owner, exponencialCurve } = await loadFixture(deployMetaFactory)

                const maxEspected = ethers.utils.parseEther("1.6")

                const spotPrice = 1

                const delta = 1.5

                const { pair } = await createPair( metaFactory, nft, 10, spotPrice, delta, exponencialCurve, poolType.nft, 0, 0)

                const espectedInput = getTokenInput("exponencialCurve", spotPrice, delta, 1)

                const ownerBalanceBefore = await owner.getBalance()

                const pairBalanceBefore = await provider.getBalance( pair.address )

                expect( pairBalanceBefore ).to.be.equal( 0 )

                const tx = await pair.swapTokenForAnyNFT(
                    1,
                    maxEspected,
                    owner.address,
                    { value: maxEspected }
                )

                const ownerBalanceAfer = await owner.getBalance()

                const pairBalanceAfter = await provider.getBalance( pair.address )

                const { amoutIn } = await getEventLog( tx, "BuyLog")

                expect( espectedInput ).to.be.equal( getNumber( pairBalanceAfter ) )

                expect( getNumber( amoutIn ) ).to.be.equal( espectedInput )

                expect( 
                    Math.floor( getNumber( ownerBalanceBefore ) ) 
                ).to.be.equal(
                    Math.floor( getNumber( ownerBalanceAfer.add( amoutIn ) ) )
                 )

            })

            it("2. should should pay a fee", async () => {

                const { metaFactory, nft, owner, cPCurve } = await loadFixture(deployMetaFactory)

                const maxEspected = ethers.utils.parseEther("3")

                const nftAmount = 10

                const spotPrice = nftAmount + 1 // token balance ( nftAmount + 1)

                const delta = nftAmount * 1   // nft balance ( nftAmount * startPrice )

                const { pair } = await createPair( metaFactory, nft, nftAmount, spotPrice, delta, cPCurve, poolType.nft, 0, 0)

                const espectedInput = getTokenInput( "cPCurve", spotPrice, delta, 2 )

                const fee = getNumber( await metaFactory.PROTOCOL_FEE() )

                const feeRecipient = await metaFactory.PROTOCOL_FEE_RECIPIENT()

                const recipientBalanceBefore = getNumber( await provider.getBalance( feeRecipient ))


                await pair.swapTokenForAnyNFT(
                    2,
                    maxEspected,
                    owner.address,
                    { value: maxEspected }
                )

                const recipientBalanceAfter = getNumber( await provider.getBalance( feeRecipient ))

                expect( espectedInput * fee ).to.be.equal( recipientBalanceAfter - recipientBalanceBefore )

            })

            it("3. should should pay a pair fee", async () => {

                const { metaFactory, nft, owner, cPCurve } = await loadFixture(deployMetaFactory)

                const maxEspected = ethers.utils.parseEther("3")

                const nftAmount = 10

                const spotPrice = nftAmount + 1 // token balance ( nftAmount + 1)

                const delta = nftAmount * 1   // nft balance ( nftAmount * startPrice )

                const { pair } = await createPair( metaFactory, nft, nftAmount, spotPrice, delta, cPCurve, poolType.nft, 0, 0)

                const espectedInput = getTokenInput( "cPCurve", spotPrice, delta, 2 )

                const fee = getNumber( await metaFactory.PROTOCOL_FEE() )

                const feeRecipient = await metaFactory.PROTOCOL_FEE_RECIPIENT()

                const recipientBalanceBefore = getNumber( await provider.getBalance( feeRecipient ))


                await pair.swapTokenForAnyNFT(
                    2,
                    maxEspected,
                    owner.address,
                    { value: maxEspected }
                )

                const recipientBalanceAfter = getNumber( await provider.getBalance( feeRecipient ))

                expect( espectedInput * fee ).to.be.equal( recipientBalanceAfter - recipientBalanceBefore )

            })

        })

    })

});
