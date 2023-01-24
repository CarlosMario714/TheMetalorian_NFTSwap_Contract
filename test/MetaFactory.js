const {
    time,
    loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const {
    poolType, 
    createPair, 
    getEventLog, 
    mintNFT, 
    sendBulkNfts
} = require("../utils/tools" )
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const NFT_ABI = require("../utils/nftABI")
const provider = ethers.provider

describe("MetaFactory", function () {

    async function deployMetaFactory() {

        const [owner, otherAccount] = await ethers.getSigners();

        const nft = new ethers.Contract(
            "0x5b8d95Bc5c45569216174b27f45DDf05A443Fd18",
            NFT_ABI,
            owner
        )

        const LinearCurve = await hre.ethers.getContractFactory("LinearCurve");
        const linearCurve = await LinearCurve.deploy();

        const ExponencialCurve = await hre.ethers.getContractFactory("ExponencialCurve");
        const exponencialCurve = await ExponencialCurve.deploy();


        const CPCurve = await hre.ethers.getContractFactory("CPCurve");
        const cPCurve = await CPCurve.deploy();

        const MetaFactory = await hre.ethers.getContractFactory("MetaFactory");
        const metaFactory = await MetaFactory.deploy(
            linearCurve.address,
            exponencialCurve.address,
            cPCurve.address
        );

        return { metaFactory, owner, otherAccount, nft, cPCurve, exponencialCurve, linearCurve };

    }

    describe("Create new NFT basic / ETH pair", () => {

        describe("Errors", () => {

            it("1. should fail if passed curve isn't alowed", async () => {

                const { metaFactory, nft, owner } = await loadFixture(deployMetaFactory)

                const nftIds = await mintNFT(nft, 10, metaFactory)

                const spotPrice = ethers.utils.parseEther("1")
                
                expect( 
                    metaFactory.createPair(
                    nft.address,
                    nftIds,
                    spotPrice.div(2),
                    spotPrice,
                    owner.address,
                    0,
                    owner.address,
                    poolType.nft
                )).to.be.revertedWith( "invalid curve" )

            })

        })

        describe("Functionalities", () => {

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

                const pair = await createPair( metaFactory, nft, 10, 1, 0.5, linearCurve, poolType.nft, 0, 0)

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

            it("2. check initial info for token pair", async() => {

                const { metaFactory, nft, linearCurve, owner } = await loadFixture( deployMetaFactory )

                const pair = await createPair( metaFactory, nft, 0, 1, 0.5, linearCurve, poolType.token, 0, 10)

                const tokenBalance = await provider.getBalance( pair.address )

                expect( tokenBalance ).to.be.equal( ethers.utils.parseEther("10") )

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
                
                expect( await pair.currentPoolType() ).to.be.equal( poolType.token )

                // check the prices curve
                
                expect( await pair.curve() ).to.be.equal( linearCurve.address )


            })

            it("3. check initial info for trade pair", async() => {

                const { metaFactory, nft, linearCurve } = await loadFixture( deployMetaFactory )

                const pair = await createPair( metaFactory, nft, 10, 1, 0.5, linearCurve, poolType.trade, 0.1, 10 )

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
                
                expect( await pair.curve() ).to.be.equal( linearCurve.address )


            })

        })

    })

    describe("sget factory info", () => {

        describe("Functionalities", () => {

            it("1. should set a new protocol fee", async () => {

                const { metaFactory } = await loadFixture(deployMetaFactory)

                const [ maxfee, fee, feeRecipient ] = await metaFactory.getFactoryInfo()

                expect( maxfee ).to.be.any

                expect( fee ).to.be.any

                expect( feeRecipient ).to.be.any

            })

        })

    })

    describe("set Protocol Fee", () => {

        describe("Errors", () => {

            it("1. should fail if caller is nor the owner", async () => {

                const { metaFactory, otherAccount } = await loadFixture(deployMetaFactory)

                const newFee = ethers.utils.parseEther("0.1")
                
                expect( 
                    metaFactory.connect( otherAccount ).setProtocolFee( newFee )
                    ).to.be.reverted

            })

            it("2. should fail if new fee is biggest than limit", async () => {

                const { metaFactory } = await loadFixture(deployMetaFactory)

                const newFee = ethers.utils.parseEther("1")
                
                expect( 
                    metaFactory.setProtocolFee( newFee )
                    ).to.be.revertedWith("new Fee exceeds limit")

            })

            it("3. should fail if new fee is equal to the old fee", async () => {

                const { metaFactory } = await loadFixture(deployMetaFactory)

                const newFee = ethers.utils.parseEther("0.01")
                
                expect( 
                    metaFactory.setProtocolFee( newFee )
                    ).to.be.revertedWith("new Fee can't be iqual than current")

            })

        })

        describe("Functionalities", () => {

            it("1. should set a new protocol fee", async () => {

                const { metaFactory } = await loadFixture(deployMetaFactory)

                const feeBefore = await metaFactory.PROTOCOL_FEE()

                const newFee = ethers.utils.parseEther("0.05")

                await metaFactory.setProtocolFee( newFee )

                const feeAfter = await metaFactory.PROTOCOL_FEE()

                expect( newFee ).to.be.greaterThan( feeBefore )

                expect( newFee ).to.be.equal( feeAfter )

            })

        })

    })

    describe("set Protocol Fee recipient", () => {

        describe("Errors", () => {

            it("1. should fail if caller is nor the owner", async () => {

                const { metaFactory, otherAccount } = await loadFixture(deployMetaFactory)
                
                expect( 
                    metaFactory.connect( otherAccount ).setProtocolFeeRecipient( otherAccount.address )
                    ).to.be.reverted

            })

            it("2. should fail if new recipient is the same than current", async () => {

                const { metaFactory } = await loadFixture(deployMetaFactory)
                
                expect( 
                    metaFactory.setProtocolFeeRecipient( metaFactory.address )
                    ).to.be.revertedWith("new recipient can't be iqual than current")

            })

        })

        describe("Functionalities", () => {

            it("1. should set a new protocol fee recipient", async () => {

                const { metaFactory, owner } = await loadFixture( deployMetaFactory )

                const recipientBefore = await metaFactory.PROTOCOL_FEE_RECIPIENT()

                await metaFactory.setProtocolFeeRecipient( owner.address )

                const recipientAfter = await metaFactory.PROTOCOL_FEE_RECIPIENT()

                expect( recipientBefore ).to.be.equal( metaFactory.address )

                expect( recipientAfter ).to.be.equal( owner.address )

            })

        })

    })

    describe("withdraw ETH", () => {

        describe("Errors", () => {

            it("1. should fail if caller is nor the owner", async () => {

                const { metaFactory, otherAccount } = await loadFixture(deployMetaFactory)
                
                expect( 
                    metaFactory.connect( otherAccount ).withdrawETH()
                    ).to.be.reverted

            })

            it("2. should fail if contract has insufficent founds", async () => {

                const { metaFactory } = await loadFixture(deployMetaFactory)
                
                expect( 
                    metaFactory.withdrawETH()
                    ).to.be.revertedWith("insufficent balance")

            })

        })

        describe("Functionalities", () => {

            it("1. should withdraw ETH balance", async () => {

                const { metaFactory, owner, otherAccount } = await loadFixture( deployMetaFactory )

                const sendAmount = ethers.utils.parseEther("10")

                await otherAccount.sendTransaction({
                    to: metaFactory.address,
                    value: sendAmount
                })

                const ownerBalanceBefore = await owner.getBalance()

                const balanceBefore = await ethers.provider.getBalance( metaFactory.address )

                expect( balanceBefore ).to.be.equal( sendAmount )

                await metaFactory.withdrawETH()

                const ownerBalanceAfter = await owner.getBalance()

                const balanceAfter = await ethers.provider.getBalance( metaFactory.address )

                expect( balanceAfter ).to.be.equal( 0 )

                // rauded to handle withdraw gas cost

                expect( 
                    Math.floor(Number(ethers.utils.formatEther(
                        ownerBalanceBefore.add( sendAmount )
                        )))
                    ).to.be.equal( 
                        Math.floor(Number(
                            ethers.utils.formatEther(ownerBalanceAfter )
                        )))

            })

        })

    })

    describe("withdraw NFTs", () => {

        describe("Errors", () => {

            it("1. should fail if caller is nor the owner", async () => {

                const { metaFactory, otherAccount, nft } = await loadFixture(deployMetaFactory)
                
                expect( 
                    metaFactory.connect( otherAccount ).withdrawNFTs( nft.address, [ 42, 43, 44] )
                    ).to.be.reverted

            })

            it("2. should fail if contract has insufficent NFT founds", async () => {

                const { metaFactory, nft } = await loadFixture(deployMetaFactory)
                
                expect( 
                    metaFactory.withdrawETH( nft.address, [ 42, 43, 44] )
                    ).to.be.reverted

            })

        })

        describe("Functionalities", () => {

            it("1. should withdraw NFT", async () => {

                const { metaFactory, owner, nft } = await loadFixture( deployMetaFactory )

                const nftIds = await mintNFT( nft, 10, metaFactory )

                await sendBulkNfts( nft, nftIds, metaFactory.address )

                const ownerBalanceBefore = await nft.balanceOf( owner.address )

                const balanceBefore = await nft.balanceOf( metaFactory.address )

                expect( balanceBefore ).to.be.equal( nftIds.length )

                expect( ownerBalanceBefore ).to.be.equal( 0 )

                await metaFactory.withdrawNFTs( nft.address, nftIds)

                const ownerBalanceAfter = await nft.balanceOf( owner.address )

                const balanceAfter = await nft.balanceOf( metaFactory.address )

                expect( balanceAfter ).to.be.equal( 0 )

                // rauded to handle withdraw gas cost

                expect( ownerBalanceAfter ).to.be.equal( nftIds.length )

            })

        })

    })

});
