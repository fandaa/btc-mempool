#!/bin/sh

sed -i "/rpcport=.*/c\rpcport=$BITCOIN_RPCPORT" /etc/bitcoin.conf
sed -i "/rpcuser=.*/c\rpcuser=$BITCOIN_RPCUSER" /etc/bitcoin.conf
sed -i "/rpcpassword=.*/c\rpcpassword=$BITCOIN_RPCPASSWORD" /etc/bitcoin.conf

cp /etc/bitcoin.conf /root/.bitcoin/
bitcoind
