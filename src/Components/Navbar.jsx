import React from 'react'
import { GiRobotHelmet } from "react-icons/gi";
import { HiOutlineUserCircle } from "react-icons/hi2";

const Navbar = () => {
  return (
    <div>
      <div className="nav flex items-center justify-between  h-[100px] px [150px]">
        <div className='Logo flex items-center gap-[10px]'>
            <i className='text-[45px]'><GiRobotHelmet /></i>
            <h3 className='text-[25px] font-[700]'>Fin<span className='text-blue-500'>GPT</span></h3>
            
        </div>
        <div className="user">
            <i className='text-[38px] cursor-pointer'><HiOutlineUserCircle /></i>
        </div>
      </div>
    </div>
  )
}

export default Navbar