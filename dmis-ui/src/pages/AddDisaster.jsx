import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function AddDisaster() {
  const [form, setForm] = useState({
    type: "",
    district: "",
    affectedPopulation: "",
    damages: "",
    needs: "",
    severity: "medium",
    numberOfHouseholdsAffected: ""
  });

  const navigate = useNavigate();
  const token = localStorage.getItem("dmisToken");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.post("http://localhost:5000/api/disasters", form, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      alert("Disaster reported successfully!");
      navigate("/dashboard");
    } catch (error) {
      alert("Error submitting disaster");
      console.error(error);
    }
  };

  return (
    <div className="form-container">
      <h2>Report Disaster</h2>

      <form onSubmit={handleSubmit}>
        <input name="type" placeholder="Type (drought)" onChange={handleChange} required />
        <input name="district" placeholder="District" onChange={handleChange} required />
        <input name="affectedPopulation" type="number" placeholder="Affected Population" onChange={handleChange} required />
        <input name="damages" placeholder="Damages" onChange={handleChange} required />
        <input name="needs" placeholder="Needs" onChange={handleChange} required />
        <input 
          name="numberOfHouseholdsAffected" 
          type="number" 
          placeholder="Number of Households Affected" 
          onChange={handleChange} 
          required 
          min="1"
        />

        <select name="severity" onChange={handleChange}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        <button type="submit">Submit Disaster</button>
      </form>
    </div>
  );
}

export default AddDisaster;
