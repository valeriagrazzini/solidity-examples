import React, {useState} from 'react'
import DropDown from './DropDown'

function Header({user, tokens, contracts, selectToken}) {
 
    if(typeof contracts === 'undefined' || tokens.length === 0 || typeof user.selectedToken === 'undefined') {
        return <div>Loading...</div>
    } 

    return (
        <header id="header" className="card">
            <div className="row">
                <div className="col-sm-1 flex">
                    <DropDown 
                        items={tokens.map(token => ({
                            label:token.ticker,
                            value: token
                        }))}
                        activeItem={{
                            label: user.selectedToken.ticker,
                            value: user.selectedToken
                        }}
                        onSelect={selectToken}
                    />
                    
                </div>
                <div className="col-sm-9">
                    <h1 className="header-title">Dex - <span className="address">Contract address: {contracts.dex.options.address}</span></h1>
                </div>
            </div>
        </header>
    )
}
export default Header